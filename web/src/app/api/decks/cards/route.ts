import { NextResponse } from "next/server";
import { DeckVisibility, DeckZone, PowerTier, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISIBILITY_VALUES = new Set<DeckVisibility>(["private", "unlisted", "public"]);
const POWER_TIER_VALUES = new Set<PowerTier>(["casual", "mid", "competitive", "cedh"]);
const ZONE_VALUES = new Set<DeckZone>(["mainboard", "sideboard", "maybeboard", "commander"]);

const MAX_CARD_ENTRIES = 400;
const MAX_QUANTITY_PER_ENTRY = 250;
const HAS_DATABASE = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length);

function sanitizeFormat(raw: unknown): string {
  if (typeof raw !== "string") {
    return "unknown";
  }
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : "unknown";
}

type DeckSummary = {
  id: string;
  name: string;
  format: string;
  powerTier: PowerTier | null;
  description: string | null;
  visibility: DeckVisibility;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  cardCount: number;
};

type RawCard = {
  printingId?: unknown;
  quantity?: unknown;
  zone?: unknown;
};

type UpdateDeckCardsPayload = {
  cards?: unknown;
  metadata?: {
    name?: unknown;
    format?: unknown;
    description?: unknown;
    visibility?: unknown;
    powerTier?: unknown;
  };
};

type SanitizedCard = {
  printingId: string;
  quantity: number;
  zone: DeckZone;
};

function serializeDeck(deck: Prisma.DeckGetPayload<{ include: { _count: { select: { cards: true } } } }>): DeckSummary {
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    powerTier: deck.powerTier ?? null,
    description: deck.description ?? null,
    visibility: deck.visibility,
    userId: deck.userId ?? null,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
    cardCount: deck._count.cards,
  };
}

function parseCards(rawCards: unknown): SanitizedCard[] {
  if (!Array.isArray(rawCards)) {
    throw new Error("cards must be an array.");
  }

  if (rawCards.length > MAX_CARD_ENTRIES) {
    throw new Error(`cards cannot include more than ${MAX_CARD_ENTRIES} entries.`);
  }

  const aggregated = new Map<string, SanitizedCard>();

  rawCards.forEach((item, index) => {
    const card = item as RawCard;
    const printingId = card.printingId;
    const quantity = card.quantity;
    const zone = card.zone;

    if (typeof printingId !== "string" || !UUID_REGEX.test(printingId)) {
      throw new Error(`cards[${index}].printingId must be a UUID.`);
    }

    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`cards[${index}].quantity must be a positive integer.`);
    }

    if (quantity > MAX_QUANTITY_PER_ENTRY) {
      throw new Error(`cards[${index}].quantity cannot exceed ${MAX_QUANTITY_PER_ENTRY}.`);
    }

    let normalizedZone: DeckZone = "mainboard";
    if (zone !== undefined) {
      if (typeof zone !== "string" || !ZONE_VALUES.has(zone as DeckZone)) {
        throw new Error(
          `cards[${index}].zone must be one of ${Array.from(ZONE_VALUES).join(", ")}.`,
        );
      }
      normalizedZone = zone as DeckZone;
    }

    const key = `${printingId}:${normalizedZone}`;
    const existing = aggregated.get(key);
    const updatedQuantity = Math.min(
      MAX_QUANTITY_PER_ENTRY,
      (existing?.quantity ?? 0) + quantity,
    );

    aggregated.set(key, {
      printingId,
      quantity: updatedQuantity,
      zone: normalizedZone,
    });
  });

  return Array.from(aggregated.values());
}

function buildDeckUpdateInput(payload: UpdateDeckCardsPayload["metadata"]): Prisma.DeckUpdateInput | null {
  if (!payload) {
    return null;
  }

  const data: Prisma.DeckUpdateInput = {};

  if (payload.name !== undefined) {
    if (typeof payload.name !== "string" || !payload.name.trim().length) {
      throw new Error("metadata.name must be a non-empty string when provided.");
    }
    data.name = payload.name.trim();
  }

  if (payload.format !== undefined) {
    if (typeof payload.format !== "string" || !payload.format.trim().length) {
      throw new Error("metadata.format must be a non-empty string when provided.");
    }
    data.format = sanitizeFormat(payload.format);
  }

  if (payload.description !== undefined) {
    if (payload.description !== null && typeof payload.description !== "string") {
      throw new Error("metadata.description must be a string or null.");
    }
    data.description = payload.description === null ? null : payload.description.trim();
  }

  if (payload.visibility !== undefined) {
    if (typeof payload.visibility !== "string" || !VISIBILITY_VALUES.has(payload.visibility as DeckVisibility)) {
      throw new Error("metadata.visibility must be private, unlisted, or public.");
    }
    data.visibility = payload.visibility as DeckVisibility;
  }

  if (payload.powerTier !== undefined) {
    if (payload.powerTier === null) {
      data.powerTier = null;
    } else if (
      typeof payload.powerTier !== "string" || !POWER_TIER_VALUES.has(payload.powerTier as PowerTier)
    ) {
      throw new Error("metadata.powerTier must be casual, mid, competitive, or cedh.");
    } else {
      data.powerTier = payload.powerTier as PowerTier;
    }
  }

  return Object.keys(data).length ? data : null;
}

async function logDeckSavedTelemetry(params: {
  deckId: string;
  userId: string | null;
  cardEntryCount: number;
  cardQuantity: number;
}) {
  try {
    await prisma.eventLog.create({
      data: {
        eventType: "deck_saved",
        subjectType: "deck",
        subjectId: params.deckId,
        userId: params.userId,
        context: {
          deckId: params.deckId,
          cardEntryCount: params.cardEntryCount,
          cardQuantity: params.cardQuantity,
        },
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("deck_saved telemetry failed", error);
    }
  }
}

export async function PUT(request: Request) {
  if (!HAS_DATABASE) {
    return NextResponse.json(
      { error: "Database connection is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get("deckId");

  if (!deckId) {
    return NextResponse.json({ error: "deckId query parameter is required." }, { status: 400 });
  }

  if (!UUID_REGEX.test(deckId)) {
    return NextResponse.json({ error: "deckId must be a UUID." }, { status: 400 });
  }

  let payload: UpdateDeckCardsPayload;
  try {
    payload = (await request.json()) as UpdateDeckCardsPayload;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to parse deck cards payload", error);
    }
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  let sanitizedCards: SanitizedCard[];
  try {
    sanitizedCards = parseCards(payload.cards);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  let deckUpdateInput: Prisma.DeckUpdateInput | null = null;
  try {
    deckUpdateInput = buildDeckUpdateInput(payload.metadata ?? undefined);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingDeck = await tx.deck.findUnique({
        where: { id: deckId },
        select: { id: true },
      });

      if (!existingDeck) {
        return null;
      }

      await tx.deckCard.deleteMany({ where: { deckId } });

      if (sanitizedCards.length) {
        await tx.deckCard.createMany({
          data: sanitizedCards.map((card) => ({
            deckId,
            printingId: card.printingId,
            quantity: card.quantity,
            zone: card.zone,
          })),
        });
      }

      const deckResult = await (deckUpdateInput
        ? tx.deck.update({
            where: { id: deckId },
            data: { ...deckUpdateInput, updatedAt: new Date() },
            include: { _count: { select: { cards: true } } },
          })
        : tx.deck.update({
            where: { id: deckId },
            data: { updatedAt: new Date() },
            include: { _count: { select: { cards: true } } },
          }));

      return deckResult;
    });

    if (!result) {
      return NextResponse.json({ error: "Deck not found." }, { status: 404 });
    }

    const cardQuantity = sanitizedCards.reduce((total, card) => total + card.quantity, 0);

    void logDeckSavedTelemetry({
      deckId,
      userId: result.userId ?? null,
      cardEntryCount: result._count.cards,
      cardQuantity,
    });

    return NextResponse.json(
      {
        data: serializeDeck(result),
        meta: {
          cardEntryCount: result._count.cards,
          cardQuantity,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return NextResponse.json({ error: "One or more printingIds do not exist." }, { status: 400 });
      }
    }

    console.error("Failed to sync deck cards", error);
    return NextResponse.json({ error: "Failed to sync deck cards." }, { status: 500 });
  }
}

export const runtime = "nodejs";

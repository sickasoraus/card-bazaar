import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

type UnknownRecord = Record<string, unknown> | null | undefined;

type RawBridgePayload = {
  type?: unknown;
  bridgeId?: unknown;
} & UnknownRecord;

type CardPayload = {
  type: "card";
  cardId: string;
  name: string;
  setCode: string | null;
  setName: string | null;
  price: string | null;
};

type DeckItem = {
  cardId: string;
  name: string;
  quantity: number;
  manaCost?: string | null;
  typeLine?: string | null;
  price?: string | null;
};

type DeckPayload = {
  type: "deck";
  deckId: string;
  name: string;
  format: string;
  totalCards: number;
  distinctCards: number;
  items: DeckItem[];
  missing: string[];
};

type NormalizedBridgePayload = CardPayload | DeckPayload;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeCardPayload(payload: UnknownRecord): CardPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be an object.");
  }

  const cardId = payload.cardId;
  const name = payload.name;

  if (!isNonEmptyString(cardId)) {
    throw new Error("cardId is required.");
  }
  if (!isNonEmptyString(name)) {
    throw new Error("name is required.");
  }

  const setCode = isNonEmptyString(payload.setCode) ? payload.setCode.trim() : null;
  const setName = isNonEmptyString(payload.setName) ? payload.setName.trim() : null;
  const price = isNonEmptyString(payload.price) ? payload.price.trim() : null;

  return {
    type: "card",
    cardId: cardId.trim(),
    name: name.trim(),
    setCode,
    setName,
    price,
  };
}

function normalizeDeckPayload(payload: UnknownRecord): DeckPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be an object.");
  }

  const deckId = payload.deckId;
  const name = payload.name;
  const format = payload.format;
  const totalCards = payload.totalCards;
  const distinctCards = payload.distinctCards;

  if (!isNonEmptyString(deckId)) {
    throw new Error("deckId is required for deck bridge.");
  }
  if (!isNonEmptyString(name)) {
    throw new Error("Deck name is required.");
  }
  if (!isNonEmptyString(format)) {
    throw new Error("Deck format is required.");
  }
  if (!Number.isFinite(totalCards)) {
    throw new Error("totalCards must be provided.");
  }
  if (!Number.isFinite(distinctCards)) {
    throw new Error("distinctCards must be provided.");
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items: DeckItem[] = rawItems
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const data = item as Record<string, unknown>;
      if (!isNonEmptyString(data.cardId) || !isNonEmptyString(data.name)) {
        return null;
      }
      const quantity = Number(data.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }
      return {
        cardId: data.cardId.trim(),
        name: data.name.trim(),
        quantity: Math.floor(quantity),
        manaCost: isNonEmptyString(data.manaCost) ? data.manaCost.trim() : null,
        typeLine: isNonEmptyString(data.typeLine) ? data.typeLine.trim() : null,
        price: isNonEmptyString(data.price) ? data.price.trim() : null,
      } satisfies DeckItem;
    })
    .filter(Boolean) as DeckItem[];

  if (!items.length) {
    throw new Error("Deck bridge requires at least one card.");
  }

  const missingRaw = Array.isArray(payload.missing) ? payload.missing : [];
  const missing = missingRaw
    .map((entry) => (isNonEmptyString(entry) ? entry.trim() : null))
    .filter(Boolean) as string[];

  return {
    type: "deck",
    deckId: deckId.trim(),
    name: name.trim(),
    format: format.trim(),
    totalCards: Math.max(0, Math.floor(Number(totalCards))),
    distinctCards: Math.max(0, Math.floor(Number(distinctCards))),
    items,
    missing,
  };
}

function normalizePayload(payload: RawBridgePayload): NormalizedBridgePayload {
  const type = payload?.type;

  if (type === "deck") {
    return normalizeDeckPayload(payload);
  }

  return normalizeCardPayload(payload);
}

function deckSummary(deck: DeckPayload): string {
  const missingSummary = deck.missing.length ? ` ${deck.missing.length} cards need manual mapping.` : "";
  return `Deck '${deck.name}' (${deck.format}) queued with ${deck.totalCards} cards (${deck.distinctCards} unique).${missingSummary}`;
}

export async function POST(request: Request) {
  let body: RawBridgePayload;

  try {
    body = (await request.json()) as RawBridgePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const normalized = normalizePayload(body);
    const bridgeId = randomUUID();

    if (process.env.NODE_ENV !== "production") {
      console.info("Card Bazaar bridge placeholder", {
        bridgeId,
        payload: normalized,
      });
    }

    const summary = normalized.type === "deck" ? deckSummary(normalized) : undefined;

    return NextResponse.json(
      {
        ok: true,
        bridgeId,
        message:
          normalized.type === "deck"
            ? "Deck manifest accepted. Card Bazaar integration will produce a staged cart when the partnership endpoint is live."
            : "Card bridge accepted. Inventory sync enables once the partnership endpoint is live.",
        summary,
        missing: normalized.type === "deck" ? normalized.missing : undefined,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initiate bridge.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bridgeId = searchParams.get("bridgeId");

  if (bridgeId) {
    return NextResponse.json(
      {
        ok: true,
        bridgeId,
        message: "Bridge placeholder active. Card Bazaar checkout URL will attach once the live integration is available.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message:
        "Use POST to initiate a Card Bazaar bridge. This route stores payload metadata until the live integration ships.",
    },
    { status: 200 },
  );
}

export const runtime = "nodejs";
export const dynamic = "force-static";

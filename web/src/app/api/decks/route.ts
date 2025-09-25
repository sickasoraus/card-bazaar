import { NextResponse } from "next/server";
import { DeckVisibility, PowerTier, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VISIBILITY_VALUES = new Set<DeckVisibility>(["private", "unlisted", "public"]);
const POWER_TIER_VALUES = new Set<PowerTier>(["casual", "mid", "competitive", "cedh"]);
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const HAS_DATABASE = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length);
const IS_STATIC_EXPORT = process.env.NEXT_PHASE === "phase-production-build";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

async function logDeckCreatedTelemetry(params: {
  deckId: string;
  userId: string | null;
  format: string;
  visibility: DeckVisibility;
  powerTier: PowerTier | null;
  cardCount: number;
}) {
  if (!isUuid(params.deckId)) {
    return;
  }

  try {
    await prisma.eventLog.create({
      data: {
        eventType: "deck_created",
        userId: params.userId,
        subjectType: "deck",
        subjectId: params.deckId,
        context: {
          deckId: params.deckId,
          format: params.format,
          visibility: params.visibility,
          powerTier: params.powerTier ?? undefined,
          cardCount: params.cardCount,
          source: params.userId ? "authenticated_api" : "anonymous_api",
        },
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("deck_created telemetry failed", error);
    }
  }
}

function parseLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_PAGE_SIZE;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function sanitizeFormat(raw: unknown): string {
  if (typeof raw !== "string") {
    return "unknown";
  }
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : "unknown";
}

type DeckWithCount = Prisma.DeckGetPayload<{
  include: {
    _count: {
      select: { cards: true };
    };
  };
}>;

function serializeDeck(deck: DeckWithCount) {
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    powerTier: deck.powerTier,
    description: deck.description,
    visibility: deck.visibility,
    userId: deck.userId,
    cardCount: deck._count.cards,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId");
  const formatParam = searchParams.get("format");
  const visibilityParam = searchParams.get("visibility");
  const limit = parseLimit(searchParams.get("limit"));

  if (userIdParam && !UUID_REGEX.test(userIdParam)) {
    return NextResponse.json({ error: "Invalid userId parameter." }, { status: 400 });
  }

  if (visibilityParam && !VISIBILITY_VALUES.has(visibilityParam as DeckVisibility)) {
    return NextResponse.json(
      { error: "visibility must be one of private, unlisted, or public." },
      { status: 400 },
    );
  }

  const where: Prisma.DeckWhereInput = {};

  if (userIdParam) {
    where.userId = userIdParam;
  }

  if (visibilityParam) {
    where.visibility = visibilityParam as DeckVisibility;
  }

  if (typeof formatParam === "string" && formatParam.trim().length) {
    where.format = formatParam.trim();
  }

  if (!HAS_DATABASE) {
    if (IS_STATIC_EXPORT) {
      return NextResponse.json({
        data: [],
        meta: { count: 0 },
        note: "Deck API disabled during static export.",
      }, { status: 200 });
    }
    return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  }

  try {
    const decks = await prisma.deck.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        _count: { select: { cards: true } },
      },
    });

    return NextResponse.json(
      {
        data: decks.map(serializeDeck),
        meta: { count: decks.length },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to query decks", error);
    return NextResponse.json({ error: "Failed to fetch decks." }, { status: 500 });
  }
}

type CreateDeckPayload = {
  name: unknown;
  format: unknown;
  description?: unknown;
  visibility?: unknown;
  powerTier?: unknown;
  userId?: unknown;
};

export async function POST(request: Request) {
  let body: CreateDeckPayload;

  try {
    body = (await request.json()) as CreateDeckPayload;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to parse deck payload", error);
    }
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const { name, format, description, visibility, powerTier, userId } = body;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  if (typeof format !== "string" || !format.trim()) {
    return NextResponse.json({ error: "format is required." }, { status: 400 });
  }

  let normalizedVisibility: DeckVisibility = "private";
  if (visibility !== undefined) {
    if (typeof visibility !== "string" || !VISIBILITY_VALUES.has(visibility as DeckVisibility)) {
      return NextResponse.json(
        { error: "visibility must be private, unlisted, or public." },
        { status: 400 },
      );
    }
    normalizedVisibility = visibility as DeckVisibility;
  }

  let normalizedPowerTier: PowerTier | null = null;
  if (powerTier !== undefined && powerTier !== null) {
    if (typeof powerTier !== "string" || !POWER_TIER_VALUES.has(powerTier as PowerTier)) {
      return NextResponse.json(
        { error: "powerTier must be casual, mid, competitive, or cedh." },
        { status: 400 },
      );
    }
    normalizedPowerTier = powerTier as PowerTier;
  }

  let normalizedUserId: string | null = null;
  if (userId !== undefined && userId !== null) {
    if (typeof userId !== "string" || !UUID_REGEX.test(userId)) {
      return NextResponse.json({ error: "userId must be a UUID." }, { status: 400 });
    }
    normalizedUserId = userId;
  }

  const normalizedDescription =
    typeof description === "string" && description.trim().length
      ? description.trim()
      : null;

  if (!HAS_DATABASE) {
    return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  }

  try {
    const deck = await prisma.deck.create({
      data: {
        name: name.trim(),
        format: sanitizeFormat(format),
        description: normalizedDescription,
        visibility: normalizedVisibility,
        powerTier: normalizedPowerTier,
        userId: normalizedUserId,
      },
      include: {
        _count: { select: { cards: true } },
      },
    });

    void logDeckCreatedTelemetry({
      deckId: deck.id,
      userId: normalizedUserId,
      format: deck.format,
      visibility: deck.visibility,
      powerTier: deck.powerTier ?? null,
      cardCount: deck._count.cards,
    });

    return NextResponse.json({ data: serializeDeck(deck) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create deck", error);
    return NextResponse.json({ error: "Failed to create deck." }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-static";

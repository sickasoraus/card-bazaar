import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TelemetryType =
  | "search_performed"
  | "card_viewed"
  | "deck_card_added"
  | "deck_created"
  | "import_attempted"
  | "export_completed";

type BaseTelemetryBody = {
  type: TelemetryType;
  payload: unknown;
  userId?: string | null;
  sessionId?: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECK_SEED_VALUES = new Set(["blank", "template", "import"]);
const IMPORT_STATUS_VALUES = new Set(["pending", "processed", "failed", "success"]);
const SUPPORTED_EVENTS = new Set<TelemetryType>([
  "search_performed",
  "card_viewed",
  "deck_card_added",
  "deck_created",
  "import_attempted",
  "export_completed",
]);

type ValidatedEvent = {
  eventType: TelemetryType;
  userId: string | null;
  sessionId: string | null;
  subjectType: string | null;
  subjectId: string | null;
  context: Prisma.JsonObject;
};

type ValidationResult =
  | { ok: true; data: ValidatedEvent }
  | { ok: false; error: string };

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function validateTelemetryBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Telemetry payload must be an object." };
  }

  const { type, payload, userId, sessionId } = body as BaseTelemetryBody;

  if (typeof type !== "string" || !SUPPORTED_EVENTS.has(type as TelemetryType)) {
    return { ok: false, error: "Unsupported telemetry event type." };
  }

  const telemetryType = type as TelemetryType;
  const normalizedUserId = isUuid(userId) ? userId : null;
  const normalizedSessionId = isUuid(sessionId) ? sessionId : null;

  switch (telemetryType) {
    case "search_performed": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "search_performed payload must be an object." };
      }
      const { query, page, totalResults } = payload as Record<string, unknown>;
      if (typeof query !== "string" || !query.trim()) {
        return { ok: false, error: "search_performed payload requires a query string." };
      }
      if (typeof page !== "number" || Number.isNaN(page)) {
        return { ok: false, error: "search_performed payload requires a numeric page." };
      }
      const context: Prisma.JsonObject = {
        query,
        page,
      };
      if (typeof totalResults === "number" && Number.isFinite(totalResults)) {
        context.totalResults = totalResults;
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "search",
          subjectId: null,
          context,
        },
      };
    }
    case "card_viewed": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "card_viewed payload must be an object." };
      }
      const { cardId, context: contextValue } = payload as Record<string, unknown>;
      if (typeof cardId !== "string" || !cardId.trim()) {
        return { ok: false, error: "card_viewed payload requires cardId." };
      }
      const context: Prisma.JsonObject = { cardId };
      if (typeof contextValue === "string" && contextValue.trim()) {
        context.context = contextValue;
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "card",
          subjectId: null,
          context,
        },
      };
    }
    case "deck_card_added": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "deck_card_added payload must be an object." };
      }
      const { deckId, cardId, zone, method } = payload as Record<string, unknown>;
      if (typeof deckId !== "string" || !deckId.trim()) {
        return { ok: false, error: "deck_card_added payload requires deckId." };
      }
      if (typeof cardId !== "string" || !cardId.trim()) {
        return { ok: false, error: "deck_card_added payload requires cardId." };
      }
      if (typeof zone !== "string" || !zone.trim()) {
        return { ok: false, error: "deck_card_added payload requires zone." };
      }
      const trimmedDeckId = deckId.trim();
      const context: Prisma.JsonObject = { deckId: trimmedDeckId, cardId, zone };
      if (method === "manual" || method === "suggestion" || method === "import") {
        context.method = method;
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "deck",
          subjectId: isUuid(trimmedDeckId) ? trimmedDeckId : null,
          context,
        },
      };
    }
    case "deck_created": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "deck_created payload must be an object." };
      }
      const { deckId, format, visibility, seed, source, cardCount } = payload as Record<string, unknown>;
      if (typeof deckId !== "string" || !deckId.trim()) {
        return { ok: false, error: "deck_created payload requires deckId." };
      }
      const trimmedDeckId = deckId.trim();
      const context: Prisma.JsonObject = { deckId: trimmedDeckId };
      if (typeof format === "string" && format.trim()) {
        context.format = format.trim();
      }
      if (typeof visibility === "string" && visibility.trim()) {
        context.visibility = visibility.trim();
      }
      if (typeof seed === "string" && DECK_SEED_VALUES.has(seed)) {
        context.seed = seed;
      }
      if (typeof source === "string" && source.trim()) {
        context.source = source.trim();
      }
      if (typeof cardCount === "number" && Number.isFinite(cardCount)) {
        context.cardCount = cardCount;
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "deck",
          subjectId: isUuid(trimmedDeckId) ? trimmedDeckId : null,
          context,
        },
      };
    }
    case "import_attempted": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "import_attempted payload must be an object." };
      }
      const { importId, source, status, errorCode, cardCount } = payload as Record<string, unknown>;
      if (typeof source !== "string" || !source.trim()) {
        return { ok: false, error: "import_attempted payload requires source." };
      }
      if (typeof status !== "string" || !IMPORT_STATUS_VALUES.has(status)) {
        return { ok: false, error: "import_attempted payload requires status (pending, processed, failed, or success)." };
      }
      const trimmedSource = source.trim();
      const trimmedImportId = typeof importId === "string" && importId.trim().length ? importId.trim() : null;
      const context: Prisma.JsonObject = {
        source: trimmedSource,
        status,
      };
      if (trimmedImportId) {
        context.importId = trimmedImportId;
      }
      if (typeof errorCode === "string" && errorCode.trim()) {
        context.errorCode = errorCode.trim();
      }
      if (typeof cardCount === "number" && Number.isFinite(cardCount)) {
        context.cardCount = cardCount;
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "import",
          subjectId: trimmedImportId && isUuid(trimmedImportId) ? trimmedImportId : null,
          context,
        },
      };
    }
    case "export_completed": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "export_completed payload must be an object." };
      }
      const { deckId, exportFormat, cardsMissing, destination } = payload as Record<string, unknown>;
      if (typeof deckId !== "string" || !deckId.trim()) {
        return { ok: false, error: "export_completed payload requires deckId." };
      }
      if (typeof exportFormat !== "string" || !exportFormat.trim()) {
        return { ok: false, error: "export_completed payload requires exportFormat." };
      }
      const trimmedDeckId = deckId.trim();
      const context: Prisma.JsonObject = {
        deckId: trimmedDeckId,
        exportFormat: exportFormat.trim(),
      };
      if (typeof cardsMissing === "number" && Number.isFinite(cardsMissing)) {
        context.cardsMissing = cardsMissing;
      }
      if (typeof destination === "string" && destination.trim()) {
        context.destination = destination.trim();
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "deck",
          subjectId: isUuid(trimmedDeckId) ? trimmedDeckId : null,
          context,
        },
      };
    }
    default:
      return { ok: false, error: "Unsupported telemetry event type." };
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to parse telemetry body", error);
    }
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateTelemetryBody(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data } = validation;
  const contextPayload: Prisma.JsonObject = { ...data.context };

  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    contextPayload.userAgent = userAgent;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    contextPayload.referer = referer;
  }

  try {
    await prisma.eventLog.create({
      data: {
        eventType: data.eventType,
        userId: data.userId,
        sessionId: data.sessionId,
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        context: contextPayload,
      },
    });
  } catch (error) {
    console.error("Failed to persist telemetry", error);
    return NextResponse.json({ error: "Failed to record telemetry." }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}

export const runtime = "nodejs";

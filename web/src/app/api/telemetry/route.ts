import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TelemetryType =
  | "search_performed"
  | "card_viewed"
  | "deck_viewed"
  | "deck_card_added"
  | "deck_created"
  | "deck_imported"
  | "import_attempted"
  | "export_completed"
  | "bridge_initiated"
  | "recommendation_served"
  | "deck_simulator_action"
  | "deck_autofill_action"
  | "auth_link_initiated"
  | "auth_link_succeeded"
  | "auth_link_failed"
  | "auth_session_refreshed"
  | "auth_session_revoked"
  | "privacy_opt_out"
  | "privacy_opt_in"
  | "privacy_data_export_requested"
  | "privacy_data_delete_requested";

type BaseTelemetryBody = {
  type: TelemetryType;
  payload: unknown;
  userId?: string | null;
  sessionId?: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECK_SEED_VALUES = new Set(["blank", "template", "import", "autofill"]);
const IMPORT_STATUS_VALUES = new Set(["pending", "processed", "failed", "success"]);
const DECK_VIEW_SOURCE_VALUES = new Set(["builder", "gallery", "share", "unknown"]);
const BRIDGE_SCOPE_VALUES = new Set(["card", "deck"]);
const RECOMMENDATION_SURFACES = new Set(["homepage", "deck_builder", "card_detail"]);
const RECOMMENDATION_ALGORITHMS = new Set(["trending", "similar_cards", "recent_activity", "manual"]);
const AUTH_LINK_STAGES = new Set(["authorization", "token_exchange", "profile_sync"]);
const SUPPORTED_EVENTS = new Set<TelemetryType>([
  "search_performed",
  "card_viewed",
  "deck_viewed",
  "deck_card_added",
  "deck_created",
  "deck_imported",
  "import_attempted",
  "export_completed",
  "bridge_initiated",
  "recommendation_served",
  "deck_simulator_action",
  "deck_autofill_action",
  "auth_link_initiated",
  "auth_link_succeeded",
  "auth_link_failed",
  "auth_session_refreshed",
  "auth_session_revoked",
  "privacy_opt_out",
  "privacy_opt_in",
  "privacy_data_export_requested",
  "privacy_data_delete_requested",
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
    case "deck_viewed": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "deck_viewed payload must be an object." };
      }
      const { deckId, source, format, cardCount } = payload as Record<string, unknown>;
      const trimmedDeckId = typeof deckId === "string" && deckId.trim().length ? deckId.trim() : null;
      const trimmedSource = typeof source === "string" && source.trim().length ? source.trim() : "unknown";
      const sourceCategory = DECK_VIEW_SOURCE_VALUES.has(trimmedSource) ? trimmedSource : "unknown";
      const context: Prisma.JsonObject = {
        source: trimmedSource,
        sourceCategory,
      };
      if (trimmedDeckId) {
        context.deckId = trimmedDeckId;
      }
      if (typeof format === "string" && format.trim()) {
        context.format = format.trim();
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
          subjectId: trimmedDeckId && isUuid(trimmedDeckId) ? trimmedDeckId : null,
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
      if (
        method === "manual" ||
        method === "suggestion" ||
        method === "import" ||
        method === "import_unresolved" || method === "autofill"
      ) {
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
    case "deck_imported": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "deck_imported payload must be an object." };
      }
      const { deckId, source, cardCount, matchedCount, missingCount } = payload as Record<string, unknown>;
      if (typeof source !== "string" || !source.trim()) {
        return { ok: false, error: "deck_imported payload requires source." };
      }
      const trimmedDeckId = typeof deckId === "string" && deckId.trim().length ? deckId.trim() : null;
      const trimmedSource = source.trim();
      const context: Prisma.JsonObject = {
        source: trimmedSource,
      };
      if (trimmedDeckId) {
        context.deckId = trimmedDeckId;
      }
      if (typeof cardCount === "number" && Number.isFinite(cardCount)) {
        context.cardCount = cardCount;
      }
      if (typeof matchedCount === "number" && Number.isFinite(matchedCount)) {
        context.matchedCount = matchedCount;
      }
      if (typeof missingCount === "number" && Number.isFinite(missingCount)) {
        context.missingCount = missingCount;
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "deck",
          subjectId: trimmedDeckId && isUuid(trimmedDeckId) ? trimmedDeckId : null,
          context,
        },
      };
    }

    case "import_attempted": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "import_attempted payload must be an object." };
      }
      const { importId, source, status, errorCode, cardCount, matchedCount, missingCount, mergedCount } = payload as Record<string, unknown>;
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
      if (typeof matchedCount === "number" && Number.isFinite(matchedCount)) {
        context.matchedCount = matchedCount;
      }
      if (typeof missingCount === "number" && Number.isFinite(missingCount)) {
        context.missingCount = missingCount;
      }
      if (typeof mergedCount === "number" && Number.isFinite(mergedCount)) {
        context.mergedCount = mergedCount;
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
    case "bridge_initiated": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "bridge_initiated payload must be an object." };
      }
      const { scope, subjectId, destination, missingCount, bridgeId: rawBridgeId } = payload as Record<string, unknown>;
      const normalizedScope = typeof scope === "string" && scope.trim().length ? scope.trim() : null;
      if (!normalizedScope || !BRIDGE_SCOPE_VALUES.has(normalizedScope)) {
        return { ok: false, error: "bridge_initiated payload requires scope (card or deck)." };
      }
      const trimmedSubjectId = typeof subjectId === "string" && subjectId.trim().length ? subjectId.trim() : null;
      const context: Prisma.JsonObject = {
        scope: normalizedScope,
      };
      if (trimmedSubjectId) {
        context.subjectId = trimmedSubjectId;
      }
      if (typeof destination === "string" && destination.trim()) {
        context.destination = destination.trim();
      }
      if (typeof missingCount === "number" && Number.isFinite(missingCount)) {
        context.missingCount = missingCount;
      }
      if (typeof rawBridgeId === "string" && rawBridgeId.trim()) {
        context.bridgeId = rawBridgeId.trim();
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: normalizedScope,
          subjectId: normalizedScope === "deck" && trimmedSubjectId && isUuid(trimmedSubjectId) ? trimmedSubjectId : null,
          context,
        },
      };
    }
    case "recommendation_served": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "recommendation_served payload must be an object." };
      }
      const { recommendationId, surface, algorithm, impressionCount } = payload as Record<string, unknown>;
      const normalizedSurface = typeof surface === "string" && surface.trim().length ? surface.trim() : null;
      if (!normalizedSurface || !RECOMMENDATION_SURFACES.has(normalizedSurface)) {
        return { ok: false, error: "recommendation_served payload requires a supported surface." };
      }
      const normalizedAlgorithm = typeof algorithm === "string" && algorithm.trim().length ? algorithm.trim() : null;
      if (!normalizedAlgorithm || !RECOMMENDATION_ALGORITHMS.has(normalizedAlgorithm)) {
        return { ok: false, error: "recommendation_served payload requires a supported algorithm." };
      }
      const trimmedRecommendationId =
        typeof recommendationId === "string" && recommendationId.trim().length
          ? recommendationId.trim()
          : null;
      const context: Prisma.JsonObject = {
        surface: normalizedSurface,
        algorithm: normalizedAlgorithm,
      };
      if (trimmedRecommendationId) {
        context.recommendationId = trimmedRecommendationId;
      }
      if (typeof impressionCount === "number" && Number.isFinite(impressionCount)) {
        context.impressionCount = impressionCount;
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "recommendation",
          subjectId: trimmedRecommendationId && isUuid(trimmedRecommendationId) ? trimmedRecommendationId : null,
          context,
        },
      };
    }

    case "deck_simulator_action": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "deck_simulator_action payload must be an object." };
      }
      const { action, deckId, cardCount, count, destination } = payload as Record<string, unknown>;
      if (typeof action !== "string" || !action.trim().length) {
        return { ok: false, error: "deck_simulator_action payload requires an action." };
      }
      const context: Prisma.JsonObject = {
        action: action.trim(),
      };
      if (typeof deckId === "string" && deckId.trim().length && isUuid(deckId.trim())) {
        context.deckId = deckId.trim();
      }
      if (typeof cardCount === "number" && Number.isFinite(cardCount)) {
        context.cardCount = cardCount;
      }
      if (typeof count === "number" && Number.isFinite(count)) {
        context.count = count;
      }
      if (typeof destination === "string" && destination.trim().length) {
        context.destination = destination.trim();
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "simulator",
          subjectId: null,
          context,
        },
      };
    }
    case "deck_autofill_action": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: "deck_autofill_action payload must be an object." };
      }
      const { action, deckId, suggestionCount } = payload as Record<string, unknown>;
      if (typeof action !== "string" || !action.trim().length) {
        return { ok: false, error: "deck_autofill_action payload requires an action." };
      }
      const context: Prisma.JsonObject = { action: action.trim() };
      if (typeof deckId === "string" && deckId.trim().length && isUuid(deckId.trim())) {
        context.deckId = deckId.trim();
      }
      if (typeof suggestionCount === "number" && Number.isFinite(suggestionCount)) {
        context.suggestionCount = suggestionCount;
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "autofill",
          subjectId: null,
          context,
        },
      };
    }
    case "auth_link_initiated":
    case "auth_link_succeeded":
    case "auth_link_failed": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: `${telemetryType} payload must be an object.` };
      }
      const { provider, stage, attemptId, redirectUri, providerUserId, errorCode, latencyMs } = payload as Record<string, unknown>;
      if (typeof provider !== "string" || !provider.trim().length) {
        return { ok: false, error: `${telemetryType} payload requires provider.` };
      }
      const normalizedProvider = provider.trim();
      const normalizedStage = typeof stage === "string" ? stage.trim().toLowerCase() : "";
      if (!AUTH_LINK_STAGES.has(normalizedStage)) {
        return { ok: false, error: `${telemetryType} payload requires a supported stage.` };
      }
      const context: Prisma.JsonObject = {
        provider: normalizedProvider,
        stage: normalizedStage,
      };
      if (typeof attemptId === "string" && attemptId.trim().length) {
        context.attemptId = attemptId.trim();
      }
      if (typeof redirectUri === "string" && redirectUri.trim().length) {
        context.redirectUri = redirectUri.trim();
      }
      if (typeof latencyMs === "number" && Number.isFinite(latencyMs)) {
        context.latencyMs = latencyMs;
      }
      if (telemetryType === "auth_link_succeeded" && typeof providerUserId === "string" && providerUserId.trim().length) {
        context.providerUserId = providerUserId.trim();
      }
      if (telemetryType === "auth_link_failed") {
        if (typeof errorCode !== "string" || !errorCode.trim().length) {
          return { ok: false, error: "auth_link_failed payload requires errorCode." };
        }
        context.errorCode = errorCode.trim();
      } else if (typeof errorCode === "string" && errorCode.trim().length) {
        context.errorCode = errorCode.trim();
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "auth_link",
          subjectId: null,
          context,
        },
      };
    }
    case "auth_session_refreshed":
    case "auth_session_revoked": {
      if (!payload || typeof payload !== "object") {
        return { ok: false, error: `${telemetryType} payload must be an object.` };
      }
      const { provider, sessionId: rawSessionId, reason } = payload as Record<string, unknown>;
      if (typeof provider !== "string" || !provider.trim().length) {
        return { ok: false, error: `${telemetryType} payload requires provider.` };
      }
      const normalizedProvider = provider.trim();
      const trimmedSessionId = typeof rawSessionId === "string" && rawSessionId.trim().length ? rawSessionId.trim() : null;
      if (telemetryType === "auth_session_refreshed" && !trimmedSessionId) {
        return { ok: false, error: "auth_session_refreshed payload requires sessionId." };
      }
      const context: Prisma.JsonObject = { provider: normalizedProvider };
      if (trimmedSessionId) {
        context.sessionId = trimmedSessionId;
      }
      if (typeof reason === "string" && reason.trim().length) {
        context.reason = reason.trim();
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "auth_session",
          subjectId: trimmedSessionId && isUuid(trimmedSessionId) ? trimmedSessionId : null,
          context,
        },
      };
    }
    case "privacy_opt_out":
    case "privacy_opt_in": {
      const context: Prisma.JsonObject = { action: telemetryType === "privacy_opt_out" ? "opt_out" : "opt_in" };
      if (payload && typeof payload === "object") {
        const { reason } = payload as Record<string, unknown>;
        if (typeof reason === "string" && reason.trim().length) {
          context.reason = reason.trim();
        }
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "privacy",
          subjectId: null,
          context,
        },
      };
    }
    case "privacy_data_export_requested":
    case "privacy_data_delete_requested": {
      const action = telemetryType === "privacy_data_export_requested" ? "data_export" : "data_delete";
      const context: Prisma.JsonObject = { action };
      if (payload && typeof payload === "object") {
        const { reason } = payload as Record<string, unknown>;
        if (typeof reason === "string" && reason.trim().length) {
          context.reason = reason.trim();
        }
      }
      return {
        ok: true,
        data: {
          eventType: telemetryType,
          userId: normalizedUserId,
          sessionId: normalizedSessionId,
          subjectType: "privacy",
          subjectId: null,
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





















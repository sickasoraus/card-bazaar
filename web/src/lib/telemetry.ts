'use client';

const TELEMETRY_ENDPOINT = "/api/telemetry";

// Lightweight telemetry stubs so we can wire instrumentation without waiting for Supabase ingest.
// When NEXT_PUBLIC_TELEMETRY_DEBUG=true, events stay client-side for inspection.

type SearchPerformedPayload = {
  query: string;
  page: number;
  totalResults?: number;
  filters?: string;
};

type CardViewedPayload = {
  cardId: string;
  context?: string;
};

type DeckCardAddedPayload = {
  deckId: string;
  cardId: string;
  zone: string;
  method?: "manual" | "suggestion" | "import" | "import_unresolved";
};

type DeckCreatedPayload = {
  deckId: string;
  format?: string;
  visibility?: "private" | "unlisted" | "public";
  seed?: "blank" | "template" | "import";
  source?: "builder" | "import" | "template" | "unknown";
  cardCount?: number;
};

type ImportAttemptedPayload = {
  importId?: string;
  source: string;
  status: "pending" | "processed" | "failed" | "success";
  errorCode?: string;
  cardCount?: number;
  matchedCount?: number;
  missingCount?: number;
  mergedCount?: number;
};

type ExportCompletedPayload = {
  deckId: string;
  exportFormat: string;
  cardsMissing?: number;
  destination?: string;
};

type DeckViewedPayload = {
  deckId?: string;
  source?: "builder" | "gallery" | "share" | "unknown";
  format?: string;
  cardCount?: number;
};

type DeckImportedPayload = {
  deckId?: string;
  source: string;
  cardCount?: number;
  matchedCount?: number;
  missingCount?: number;
};

type BridgeInitiatedPayload = {
  scope: "card" | "deck";
  subjectId?: string;
  destination?: string;
  missingCount?: number;
  bridgeId?: string;
};

type RecommendationServedPayload = {
  recommendationId?: string;
  surface: "homepage" | "deck_builder" | "card_detail";
  algorithm: "trending" | "similar_cards" | "recent_activity" | "manual";
  impressionCount?: number;
};
type SimulatorActionPayload = {
  action:
    | "load_deck"
    | "shuffle"
    | "draw"
    | "draw_opening_hand"
    | "mulligan"
    | "next_turn"
    | "move_card"
    | "reset"
    | "clear";
  deckId?: string;
  cardCount?: number;
  count?: number;
  destination?: string;
};
type AutofillActionPayload = {
  action: "requested" | "received" | "added" | "add_all" | "dismissed";
  deckId?: string;
  suggestionCount?: number;
};


type TelemetryEnvelope =
  | { type: "search_performed"; payload: SearchPerformedPayload }
  | { type: "card_viewed"; payload: CardViewedPayload }
  | { type: "deck_viewed"; payload: DeckViewedPayload }
  | { type: "deck_card_added"; payload: DeckCardAddedPayload }
  | { type: "deck_created"; payload: DeckCreatedPayload }
  | { type: "deck_imported"; payload: DeckImportedPayload }
  | { type: "import_attempted"; payload: ImportAttemptedPayload }
  | { type: "export_completed"; payload: ExportCompletedPayload }
  | { type: "bridge_initiated"; payload: BridgeInitiatedPayload }
  | { type: "deck_simulator_action"; payload: SimulatorActionPayload }
  | { type: "deck_autofill_action"; payload: AutofillActionPayload }
  | { type: "recommendation_served"; payload: RecommendationServedPayload };

const debugMode = () => process.env.NEXT_PUBLIC_TELEMETRY_DEBUG === "true";

function dispatchTelemetry(envelope: TelemetryEnvelope) {
  try {
    const body = JSON.stringify(envelope);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(TELEMETRY_ENDPOINT, blob);
      return;
    }

    void fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Telemetry dispatch failed", error);
    }
  }
}

function emitTelemetry(envelope: TelemetryEnvelope) {
  if (debugMode()) {
    console.debug("[telemetry]", envelope.type, envelope.payload);
    return;
  }

  dispatchTelemetry(envelope);
}

export function trackSearchPerformed(payload: SearchPerformedPayload) {
  emitTelemetry({ type: "search_performed", payload });
}

export function trackCardViewed(payload: CardViewedPayload) {
  emitTelemetry({ type: "card_viewed", payload });
}

export function trackDeckViewed(payload: DeckViewedPayload) {
  emitTelemetry({ type: "deck_viewed", payload });
}

export function trackDeckCardAdded(payload: DeckCardAddedPayload) {
  emitTelemetry({ type: "deck_card_added", payload });
}

export function trackDeckCreated(payload: DeckCreatedPayload) {
  emitTelemetry({ type: "deck_created", payload });
}

export function trackDeckImported(payload: DeckImportedPayload) {
  emitTelemetry({ type: "deck_imported", payload });
}

export function trackImportAttempted(payload: ImportAttemptedPayload) {
  emitTelemetry({ type: "import_attempted", payload });
}

export function trackExportCompleted(payload: ExportCompletedPayload) {
  emitTelemetry({ type: "export_completed", payload });
}

export function trackBridgeInitiated(payload: BridgeInitiatedPayload) {
  emitTelemetry({ type: "bridge_initiated", payload });
}

export function trackRecommendationServed(payload: RecommendationServedPayload) {
  emitTelemetry({ type: "recommendation_served", payload });
}



export function trackSimulatorAction(payload: SimulatorActionPayload) {
  emitTelemetry({ type: "deck_simulator_action", payload });
}
export function trackAutofillAction(payload: AutofillActionPayload) {
  emitTelemetry({ type: "deck_autofill_action", payload });
}

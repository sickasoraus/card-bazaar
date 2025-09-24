"use client";

// Lightweight telemetry stubs so we can wire instrumentation without waiting for Supabase ingest.
// Replace `emitTelemetry` implementation once the server endpoint is ready.

type SearchPerformedPayload = {
  query: string;
  page: number;
  totalResults?: number;
};

type CardViewedPayload = {
  cardId: string;
  context?: string;
};

type DeckCardAddedPayload = {
  deckId: string;
  cardId: string;
  zone: string;
  method?: "manual" | "suggestion" | "import";
};

type TelemetryEnvelope =
  | { type: "search_performed"; payload: SearchPerformedPayload }
  | { type: "card_viewed"; payload: CardViewedPayload }
  | { type: "deck_card_added"; payload: DeckCardAddedPayload };

const debugMode = () => process.env.NEXT_PUBLIC_TELEMETRY_DEBUG === "true";

function emitTelemetry(envelope: TelemetryEnvelope) {
  if (debugMode()) {
    console.debug("[telemetry]", envelope.type, envelope.payload);
  }
  // Placeholder until Supabase Edge endpoint is available.
  // navigator.sendBeacon or fetch would be implemented here.
}

export function trackSearchPerformed(payload: SearchPerformedPayload) {
  emitTelemetry({ type: "search_performed", payload });
}

export function trackCardViewed(payload: CardViewedPayload) {
  emitTelemetry({ type: "card_viewed", payload });
}

export function trackDeckCardAdded(payload: DeckCardAddedPayload) {
  emitTelemetry({ type: "deck_card_added", payload });
}

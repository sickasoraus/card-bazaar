export const BRIDGE_ENDPOINT = "/api/cart-bridge";

export type CardBridgePayload = {
  type?: "card";
  cardId: string;
  name: string;
  setCode?: string | null;
  setName?: string | null;
  price?: string | null;
};

export type DeckBridgeItem = {
  cardId: string;
  name: string;
  quantity: number;
  manaCost?: string | null;
  typeLine?: string | null;
  price?: string | null;
  zone?: string;
};

export type DeckBridgePayload = {
  type: "deck";
  deckId: string;
  name: string;
  format: string;
  totalCards: number;
  distinctCards: number;
  items: DeckBridgeItem[];
  missing?: string[];
};

type BridgeRequest = CardBridgePayload | DeckBridgePayload;

export type BridgeResponse = {
  ok: boolean;
  bridgeId?: string;
  message?: string;
  checkoutUrl?: string;
  summary?: string;
  missing?: string[];
};

function toRequestBody(payload: BridgeRequest): BridgeRequest {
  if (payload.type === "deck") {
    return payload;
  }

  return { ...payload, type: "card" };
}

async function safeParse(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function initiateCardBazaarBridge(payload: BridgeRequest): Promise<BridgeResponse> {
  const body = toRequestBody(payload);

  const response = await fetch(BRIDGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const parsed = await safeParse(response);
    const message = typeof parsed?.error === "string" ? parsed.error : "Card Bazaar bridge request failed.";
    throw new Error(message);
  }

  const parsed = (await response.json()) as BridgeResponse;
  return parsed;
}

export async function pollBridgeStatus(bridgeId: string): Promise<BridgeResponse> {
  const response = await fetch(`${BRIDGE_ENDPOINT}?bridgeId=${encodeURIComponent(bridgeId)}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const parsed = await safeParse(response);
    const message = typeof parsed?.error === "string" ? parsed.error : "Failed to poll Card Bazaar bridge.";
    throw new Error(message);
  }

  const parsed = (await response.json()) as BridgeResponse;
  return parsed;
}

export function isDeckBridgeResponse(response: BridgeResponse): boolean {
  return Array.isArray(response.missing) || typeof response.checkoutUrl === "string";
}

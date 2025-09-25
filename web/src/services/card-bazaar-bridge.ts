const BRIDGE_ENDPOINT = "/api/cart-bridge";

type BridgeRequest = {
  cardId: string;
  name: string;
  setCode: string | null;
  setName: string | null;
  price: string | null;
};

type BridgeResponse = {
  ok: boolean;
  bridgeId?: string;
  message?: string;
};

export async function initiateCardBazaarBridge(payload: BridgeRequest): Promise<BridgeResponse> {
  const response = await fetch(BRIDGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await safeParse(response);
    const errorMessage = typeof body?.error === "string" ? body.error : "Card Bazaar bridge request failed.";
    throw new Error(errorMessage);
  }

  const body = (await response.json()) as BridgeResponse;
  return body;
}

async function safeParse(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

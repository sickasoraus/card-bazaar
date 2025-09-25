import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

type BridgePayload = {
  cardId?: unknown;
  name?: unknown;
  setCode?: unknown;
  setName?: unknown;
  price?: unknown;
};

type NormalizedBridgePayload = {
  cardId: string;
  name: string;
  setCode: string | null;
  setName: string | null;
  price: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizePayload(payload: BridgePayload): NormalizedBridgePayload {
  if (!isNonEmptyString(payload.cardId)) {
    throw new Error("cardId is required.");
  }
  if (!isNonEmptyString(payload.name)) {
    throw new Error("name is required.");
  }

  return {
    cardId: payload.cardId.trim(),
    name: payload.name.trim(),
    setCode: isNonEmptyString(payload.setCode) ? payload.setCode.trim() : null,
    setName: isNonEmptyString(payload.setName) ? payload.setName.trim() : null,
    price: isNonEmptyString(payload.price) ? payload.price.trim() : null,
  };
}

export async function POST(request: Request) {
  let body: BridgePayload;

  try {
    body = (await request.json()) as BridgePayload;
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

    return NextResponse.json(
      {
        ok: true,
        bridgeId,
        message:
          "Bridge request accepted. Inventory sync will activate once the Card Bazaar partnership endpoint is live.",
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initiate bridge.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
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

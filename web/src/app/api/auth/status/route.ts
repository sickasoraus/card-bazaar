import { NextResponse } from "next/server";

const SSO_ENABLED = process.env.NEXT_PUBLIC_SSO_ENABLED === "true";

export async function GET() {
  if (!SSO_ENABLED) {
    return NextResponse.json({
      provider: "card_bazaar",
      linked: false,
      lastSyncedAt: null,
      note: "Card Bazaar SSO disabled in static export",
    });
  }

  return NextResponse.json({
    provider: "card_bazaar",
    linked: false,
    lastSyncedAt: null,
  });
}

export const dynamic = "force-static";
export const runtime = "nodejs";

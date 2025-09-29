import { NextResponse } from "next/server";

const SSO_ENABLED = process.env.NEXT_PUBLIC_SSO_ENABLED === "true";
const HAS_SSO_CONFIG = Boolean(
  process.env.CARDBAZAAR_OIDC_CLIENT_ID &&
    process.env.CARDBAZAAR_OIDC_CLIENT_SECRET &&
    process.env.CARDBAZAAR_OIDC_ISSUER &&
    process.env.CARDBAZAAR_OIDC_REDIRECT_URI,
);

export async function GET() {
  if (!SSO_ENABLED || !HAS_SSO_CONFIG) {
    return NextResponse.json({
      provider: "card_bazaar",
      linked: false,
      lastSyncedAt: null,
      note: "Card Bazaar SSO bridge is stubbed until an OIDC provider is connected.",
      stub: true,
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

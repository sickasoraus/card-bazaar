import { NextResponse } from "next/server";
import { logAuthSession } from "@/services/auth-bridge";

const SSO_ENABLED = process.env.NEXT_PUBLIC_SSO_ENABLED === "true";
const HAS_SSO_CONFIG = Boolean(
  process.env.CARDBAZAAR_OIDC_CLIENT_ID &&
    process.env.CARDBAZAAR_OIDC_CLIENT_SECRET &&
    process.env.CARDBAZAAR_OIDC_ISSUER &&
    process.env.CARDBAZAAR_OIDC_REDIRECT_URI,
);

export async function POST(request: Request) {
  if (!SSO_ENABLED || !HAS_SSO_CONFIG) {
    return NextResponse.json(
      {
        ok: false,
        stub: true,
        message: "Card Bazaar SSO revoke is unavailable until OIDC credentials are provisioned.",
      },
      { status: 200 },
    );
  }
  const body = (await request.json().catch(() => null)) as { sessionId?: string; reason?: string } | null;
  logAuthSession("revoked", {
    sessionId: body?.sessionId,
    reason: body?.reason ?? "manual",
  });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-static";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { generatePkcePair, buildAuthorizeUrl } from "@/services/auth-bridge";

const SSO_ENABLED = process.env.NEXT_PUBLIC_SSO_ENABLED === "true";

export async function POST(request: Request) {
  if (!SSO_ENABLED) {
    return NextResponse.json(
      { error: "Card Bazaar SSO disabled in static export." },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => null) as
    | {
        redirectUri?: string;
        scope?: string;
        clientId?: string;
        attemptId?: string;
      }
    | null;

  const clientId = body?.clientId ?? process.env.NEXT_PUBLIC_SSO_CLIENT_ID ?? "";
  const redirectUri = body?.redirectUri ?? process.env.CARDBAZAAR_OIDC_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing clientId or redirectUri for Card Bazaar link flow." },
      { status: 400 },
    );
  }

  const attemptId =
    body?.attemptId ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `attempt_${Math.random().toString(36).slice(2)}`);
  const pkce = await generatePkcePair();
  const authorizeUrl = buildAuthorizeUrl({
    ...pkce,
    clientId,
    redirectUri,
    scope: body?.scope,
    attemptId,
  });

  return NextResponse.json(
    {
      authorizeUrl,
      verifier: pkce.verifier,
      attemptId,
    },
    { status: 200 },
  );
}

export const dynamic = "force-static";
export const runtime = "nodejs";

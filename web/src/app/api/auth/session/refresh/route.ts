import { NextResponse } from "next/server";
import { logAuthSession } from "@/services/auth-bridge";

const SSO_ENABLED = process.env.NEXT_PUBLIC_SSO_ENABLED === "true";

export async function POST(request: Request) {
  if (!SSO_ENABLED) {
    return NextResponse.json(
      { error: "Card Bazaar session refresh unavailable in static export." },
      { status: 501 },
    );
  }
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  if (body?.sessionId) {
    logAuthSession("refreshed", { sessionId: body.sessionId, reason: "manual" });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-static";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { hasPrivacyDatabase } from "@/services/privacy";

export async function GET() {
  const hasDb = hasPrivacyDatabase();

  if (!hasDb) {
    return NextResponse.json({
      optOut: false,
      source: "static",
      stub: true,
      note: "Privacy database is not configured; returning default preferences.",
      lastRequest: null,
    });
  }

  return NextResponse.json({
    optOut: false,
    source: "stub",
    stub: true,
    note: "API preferences operate in demo mode on the static export. Server deployment will hydrate from Supabase.",
    lastRequest: null,
  });
}

export const dynamic = "force-static";
export const runtime = "nodejs";

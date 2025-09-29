import { NextResponse } from "next/server";

import { hasPrivacyDatabase, recordPrivacyRequest } from "@/services/privacy";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    reason?: string;
    source?: string;
  } | null;

  const resolvedUserId = body?.userId ?? null;
  const reason = body?.reason ?? null;
  const source = body?.source ?? "ui";
  const hasDb = hasPrivacyDatabase();

  if (hasDb) {
    await recordPrivacyRequest({
      type: "telemetry_opt_out",
      userId: resolvedUserId,
      reason,
      source,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      status: hasDb ? "pending" : "recorded-static",
      message: "Telemetry opt-out recorded.",
      stub: !hasDb,
      note: hasDb
        ? undefined
        : "Supabase privacy storage is not connected; preference stored locally until the bridge is configured.",
    },
    { status: 202 },
  );
}

export const dynamic = "force-static";
export const runtime = "nodejs";

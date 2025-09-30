import { NextResponse } from "next/server";
import { IngestionJobType, JobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const JOB_TYPES: IngestionJobType[] = [
  IngestionJobType.telemetry_rollup,
  IngestionJobType.trending_refresh,
  IngestionJobType.scryfall_bulk,
  IngestionJobType.price_snapshot,
];

type JobSummary = {
  jobType: IngestionJobType;
  status: JobStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
} | null;

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        jobs: [],
        hasDatabase: false,
      },
      { status: 200 },
    );
  }

  const summaries = await Promise.all(JOB_TYPES.map((jobType) => fetchLatest(jobType)));

  const response = NextResponse.json(
    {
      hasDatabase: true,
      jobs: summaries.filter(Boolean),
    },
    { status: 200 },
  );

  response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");

  return response;
}

async function fetchLatest(jobType: IngestionJobType): Promise<JobSummary> {
  const run = await prisma.ingestionJobRun.findFirst({
    where: { jobType },
    orderBy: { startedAt: "desc" },
  });

  if (!run) {
    return null;
  }

  const completedAt = run.completedAt ?? null;
  const durationMs = completedAt ? completedAt.getTime() - run.startedAt.getTime() : null;

  return {
    jobType,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    completedAt: completedAt ? completedAt.toISOString() : null,
    durationMs,
    errorMessage: run.errorMessage ?? null,
    metadata: normalizeMetadata(run.metadata ?? null),
  };
}

function normalizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  return metadata as Record<string, unknown>;
}

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 120;

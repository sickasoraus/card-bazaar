import type { Prisma, PrivacyRequestStatus, PrivacyRequestType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const HAS_DATABASE = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length);

type CreatePrivacyRequestParams = {
  type: PrivacyRequestType;
  userId?: string | null;
  reason?: string | null;
  source?: string | null;
  status?: PrivacyRequestStatus;
};

export async function recordPrivacyRequest({
  type,
  userId = null,
  reason = null,
  source = null,
  status,
}: CreatePrivacyRequestParams) {
  if (!HAS_DATABASE) {
    return { id: null, status: "static" as const };
  }

  const metadata: Prisma.JsonObject = {};
  if (reason) {
    metadata.reason = reason;
  }
  if (source) {
    metadata.source = source;
  }

  return prisma.privacyRequest.create({
    data: {
      userId,
      requestType: type,
      status: status ?? (type === "telemetry_opt_in" ? "completed" : "pending"),
      metadata: Object.keys(metadata).length ? metadata : undefined,
    },
  });
}

export function hasPrivacyDatabase(): boolean {
  return HAS_DATABASE;
}

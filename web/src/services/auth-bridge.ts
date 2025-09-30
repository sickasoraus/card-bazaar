import { trackAuthLinkEvent, trackAuthSessionEvent } from "@/lib/telemetry";

export type AuthLinkStage = "authorization" | "token_exchange" | "profile_sync";
export type AuthLinkStatus = "initiated" | "succeeded" | "failed";
export type AuthSessionAction = "refreshed" | "revoked";

export type PkcePair = {
  verifier: string;
  challenge: string;
  method: "S256";
};

/**
 * Generates a PKCE verifier/challenge pair for the Card Bazaar OIDC flow.
 */
export async function generatePkcePair(): Promise<PkcePair> {
  const cryptoApi = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (!cryptoApi?.getRandomValues || !cryptoApi.subtle) {
    throw new Error("PKCE generation requires Web Crypto support.");
  }
  const raw = cryptoApi.getRandomValues(new Uint8Array(32));
  const verifier = base64UrlEncode(raw);
  const digest = await cryptoApi.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(new Uint8Array(digest));
  return { verifier, challenge, method: "S256" };
}

function base64UrlEncode(buffer: Uint8Array): string {
  let str = "";
  buffer.forEach((byte) => {
    str += String.fromCharCode(byte);
  });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export type StartLinkOptions = {
  clientId: string;
  redirectUri: string;
  scope?: string;
  attemptId: string;
};

export function buildAuthorizeUrl(options: StartLinkOptions & PkcePair) {
  const providerOrigin = process.env.NEXT_PUBLIC_CARDBAZAAR_ORIGIN ?? "";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    scope: options.scope ?? "openid profile email",
    code_challenge: options.challenge,
    code_challenge_method: options.method,
    state: options.attemptId,
  });

  return `${providerOrigin}/oauth2/authorize?${params.toString()}`;
}

export function logAuthLink(status: AuthLinkStatus, payload: {
  stage: AuthLinkStage;
  attemptId: string;
  redirectUri: string;
  providerUserId?: string;
  errorCode?: string;
  latencyMs?: number;
}) {
  trackAuthLinkEvent(status, {
    provider: "card_bazaar",
    stage: payload.stage,
    attemptId: payload.attemptId,
    redirectUri: payload.redirectUri,
    providerUserId: payload.providerUserId,
    errorCode: payload.errorCode,
    latencyMs: payload.latencyMs,
  });
}

export function logAuthSession(action: AuthSessionAction, payload: {
  sessionId?: string;
  reason?: string;
}) {
  trackAuthSessionEvent(action, {
    provider: "card_bazaar",
    sessionId: payload.sessionId,
    reason: payload.reason,
  });
}


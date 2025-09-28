"use client";

import { useEffect, useMemo, useState } from "react";

import { trackPrivacyEvent } from "@/lib/telemetry";

const STORAGE_KEY = "metablazt.telemetry.optOut";

type InFlightAction = "telemetry" | "export" | "delete" | null;

async function postPrivacy(endpoint: string, body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<{ ok: boolean; message?: string; status?: string }>;
}

export default function PrivacySettingsPage() {
  const [telemetryOptOut, setTelemetryOptOut] = useState(false);
  const [action, setAction] = useState<InFlightAction>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setTelemetryOptOut(stored === "1");
  }, []);

  const isTelemetryPending = action === "telemetry";
  const isExportPending = action === "export";
  const isDeletionPending = action === "delete";

  const telemetryButtonLabel = useMemo(
    () => (telemetryOptOut ? "Enable advanced tracking" : "Disable advanced tracking"),
    [telemetryOptOut],
  );

  const telemetryStatusCopy = useMemo(
    () => (telemetryOptOut ? "Advanced tracking is disabled." : "Advanced tracking is enabled."),
    [telemetryOptOut],
  );

  const handleTelemetryToggle = async (nextValue: boolean) => {
    setAction("telemetry");
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const endpoint = nextValue ? "/api/privacy/opt-out" : "/api/privacy/opt-in";
      const { message } = await postPrivacy(endpoint, {
        source: "settings-privacy",
      });
      setTelemetryOptOut(nextValue);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, nextValue ? "1" : "0");
      }
      trackPrivacyEvent(nextValue ? "privacy_opt_out" : "privacy_opt_in", { reason: "settings-privacy" });
      setStatusMessage(message ?? (nextValue ? "Advanced tracking disabled." : "Advanced tracking enabled."));
    } catch (error) {
      setErrorMessage((error as Error).message || "Unable to update telemetry preference right now.");
    } finally {
      setAction(null);
    }
  };

  const handleExportRequest = async () => {
    setAction("export");
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const { message } = await postPrivacy("/api/privacy/export", {
        source: "settings-privacy",
      });
      trackPrivacyEvent("privacy_data_export_requested", { reason: "settings-privacy" });
      setStatusMessage(message ?? "Export request queued. We&apos;ll reach out via email once it's ready.");
    } catch (error) {
      setErrorMessage((error as Error).message || "Unable to queue an export request right now.");
    } finally {
      setAction(null);
    }
  };

  const handleDeletionRequest = async () => {
    setAction("delete");
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const { message } = await postPrivacy("/api/privacy/delete", {
        source: "settings-privacy",
      });
      trackPrivacyEvent("privacy_data_delete_requested", { reason: "settings-privacy" });
      setStatusMessage(message ?? "Deletion request queued. Our team will confirm within 30 days.");
    } catch (error) {
      setErrorMessage((error as Error).message || "Unable to queue a deletion request right now.");
    } finally {
      setAction(null);
    }
  };

  const toggleButtonClass = `rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] transition-transform ${
    isTelemetryPending ? "cursor-not-allowed opacity-60" : "hover:-translate-y-[1px]"
  }`;

  const secondaryButtonClass = `mt-4 w-full rounded-[var(--radius-control)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] transition-colors ${
    isExportPending ? "cursor-not-allowed opacity-60" : "hover:border-white/40"
  }`;

  const dangerButtonClass = `mt-4 w-full rounded-[var(--radius-control)] border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-red-200 transition-colors ${
    isDeletionPending ? "cursor-not-allowed opacity-60" : "hover:border-red-300/60"
  }`;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-6 px-6 py-12 text-[color:var(--color-text-body)]">
      <header className="space-y-3">
        <p className="font-display text-sm uppercase tracking-[4px] text-[color:var(--color-accent-highlight)]">
          Privacy &amp; Data Controls
        </p>
        <h1 className="font-display text-4xl text-[color:var(--color-text-hero)]">Own your Metablazt footprint.</h1>
        <p className="max-w-2xl text-sm text-[color:var(--color-text-subtle)]">
          These controls cover behavior analytics inside Metablazt. Partner integrations, such as Card Bazaar commerce,
          will honour the same preferences once single sign-on launches.
        </p>
      </header>

      {statusMessage ? (
        <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {statusMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-display text-xl text-[color:var(--color-text-hero)]">Telemetry preferences</h2>
            <p className="text-sm text-[color:var(--color-text-subtle)]">
              Toggle whether advanced analytics events (deck usage, recommendation feedback, simulator actions) are stored.
              Basic operational logging remains so the app functions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleTelemetryToggle(!telemetryOptOut)}
            disabled={isTelemetryPending}
            className={toggleButtonClass}
          >
            {telemetryButtonLabel}
          </button>
        </div>
        <p className="mt-4 text-xs text-[color:var(--color-text-subtle)]">Status: {telemetryStatusCopy}</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
          <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">Request a data export</h3>
          <p className="mt-2 text-sm text-[color:var(--color-text-subtle)]">
            We&apos;ll package your decks, activity log, and recommendation history in a downloadable archive.
          </p>
          <button type="button" onClick={handleExportRequest} disabled={isExportPending} className={secondaryButtonClass}>
            Queue export
          </button>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20">
          <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">Request account deletion</h3>
          <p className="mt-2 text-sm text-[color:var(--color-text-subtle)]">
            This flags your account for removal across Metablazt and Card Bazaar. We&apos;ll confirm via email before proceeding.
          </p>
          <button type="button" onClick={handleDeletionRequest} disabled={isDeletionPending} className={dangerButtonClass}>
            Request deletion
          </button>
        </div>
      </section>

      <footer className="mt-8 rounded-[16px] border border-white/10 bg-white/5 p-5 text-xs text-[color:var(--color-text-subtle)]">
        Metablazt honours global privacy standards (GDPR, CCPA). While we prep full customer support tooling, these
        requests are processed manually within 30 days. Reach the team at privacy@metablazt.gg if you need expedited help.
      </footer>
    </main>
  );
}

"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";

import { useDraftDeck } from "@/hooks/use-draft-deck";
import { useScryfallSearch } from "@/hooks/use-scryfall-search";
import type { ScryfallCard } from "@/services/scryfall";
import { initiateCardBazaarBridge } from "@/services/card-bazaar-bridge";

const DEFAULT_QUERY = "game:paper";

const IMPORT_SOURCE_OPTIONS = [
  { value: "manual_list" as const, label: "Manual paste" },
  { value: "mtg_arena_txt" as const, label: "MTG Arena .txt" },
  { value: "csv_upload" as const, label: "CSV upload" },
];

type ImportSourceValue = (typeof IMPORT_SOURCE_OPTIONS)[number]["value"];

const EXPORT_OPTIONS = [
  { value: "json" as const, label: "JSON" },
  { value: "mtga" as const, label: "MTG Arena" },
  { value: "csv" as const, label: "CSV" },
];

type DeckVisibility = "private" | "unlisted" | "public";

export default function DeckBuilderPage() {
  const [searchInput, setSearchInput] = useState(DEFAULT_QUERY);

  const {
    deck,
    cardCount,
    recentDrafts,
    addCard,
    decrementCard,
    removeCard,
    updateDeckMeta,
    resetDeck,
    loadDraft,
    deleteDraft,
    importFromList,
    exportDeck,
    buildCardBazaarPayload,
    syncToSupabase,
    isSupabaseConfigured,
    isSyncing,
    syncError,
  } = useDraftDeck();

  const [isImportPanelOpen, setImportPanelOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importSource, setImportSource] = useState<ImportSourceValue>("manual_list");
  const [importFeedback, setImportFeedback] = useState<Awaited<ReturnType<typeof importFromList>> | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isBridgingDeck, setIsBridgingDeck] = useState(false);
  const [bridgeMessage, setBridgeMessage] = useState<string | null>(null);
  const [bridgeSummary, setBridgeSummary] = useState<string | null>(null);
  const [bridgeMissing, setBridgeMissing] = useState<string[]>([]);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const { data, isLoading, error, updateParams } = useScryfallSearch({ initialQuery: DEFAULT_QUERY });

  const cards = useMemo<ScryfallCard[]>(() => data?.data ?? [], [data]);

  const zoneBreakdown = useMemo(() => {
    const totals = {
      mainboard: 0,
      sideboard: 0,
      commander: 0,
      maybeboard: 0,
      unresolved: 0,
    };

    deck.cards.forEach((card) => {
      const zone = card.zone ?? "mainboard";
      if (zone in totals) {
        totals[zone as keyof typeof totals] += card.quantity;
      }
      if (card.resolved === false) {
        totals.unresolved += card.quantity;
      }
    });

    return totals;
  }, [deck.cards]);

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = searchInput.trim();
      if (!trimmed) {
        return;
      }
      updateParams({ query: trimmed, page: 1 });
    },
    [searchInput, updateParams],
  );

  const handleAddCard = useCallback(
    (card: ScryfallCard) => {
      addCard({
        cardId: card.id,
        name: card.name,
        manaCost: card.mana_cost,
        typeLine: card.type_line,
        imageUrl: card.image_uris?.small ?? card.image_uris?.normal ?? null,
      });
    },
    [addCard],
  );

  const handleImportPanelToggle = useCallback(() => {
    setImportPanelOpen((open) => !open);
    setImportError(null);
    setImportFeedback(null);
  }, []);

  const handleImportSubmit = useCallback(async () => {
    if (!importText.trim()) {
      setImportError("Add a deck list to import.");
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await importFromList(importText, importSource);
      setImportFeedback(result);
      if (!result.ok) {
        setImportError(result.error);
      } else if (!result.missing.length) {
        setImportPanelOpen(false);
        setImportText("");
      }
    } catch (error) {
      console.error("Import failed", error);
      setImportError("Failed to import deck list.");
    } finally {
      setIsImporting(false);
    }
  }, [importFromList, importSource, importText]);

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setIsImporting(true);
      setImportError(null);
      setImportPanelOpen(true);

      try {
        const text = await file.text();
        setImportText(text);
        const detectedSource: ImportSourceValue = file.name.toLowerCase().endsWith(".csv")
          ? "csv_upload"
          : "mtg_arena_txt";
        setImportSource(detectedSource);
        const result = await importFromList(text, detectedSource);
        setImportFeedback(result);
        if (!result.ok) {
          setImportError(result.error);
        }
      } catch (error) {
        console.error("Import file read failed", error);
        setImportError("Failed to read deck file.");
      } finally {
        setIsImporting(false);
        event.target.value = "";
      }
    },
    [importFromList],
  );

  const handleExport = useCallback(
    (format: "json" | "mtga" | "csv") => {
      const payload = exportDeck(format);
      if (!payload) {
        window.alert("Nothing to export yet.");
        return;
      }

      const extension = format === "json" ? "json" : format === "csv" ? "csv" : "txt";
      const mimeType = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
      const filename = `${deck.name.replace(/[^a-z0-9-_]+/gi, "-") || "metablazt-deck"}.${extension}`;

      const blob = new Blob([payload], { type: mimeType });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(href);
    },
    [deck.name, exportDeck],
  );

  const handleBridgeDeck = useCallback(async () => {
    if (!deck.cards.length) {
      setBridgeError("Add cards before bridging to Card Bazaar.");
      return;
    }

    const payload = buildCardBazaarPayload();
    if (!payload) {
      setBridgeError("Deck not ready for Card Bazaar bridge.");
      return;
    }

    setIsBridgingDeck(true);
    setBridgeError(null);
    setBridgeMessage(null);
    setBridgeSummary(null);
    setBridgeMissing([]);

    try {
      const response = await initiateCardBazaarBridge(payload);
      setBridgeMessage(response.message ?? "Bridge request accepted.");
      setBridgeSummary(response.summary ?? null);
      setBridgeMissing(response.missing ?? []);
    } catch (error) {
      console.error("Bridge request failed", error);
      setBridgeError(error instanceof Error ? error.message : "Failed to bridge deck.");
    } finally {
      setIsBridgingDeck(false);
    }
  }, [buildCardBazaarPayload, deck.cards.length]);

  const handleSupabaseSync = useCallback(async () => {
    const result = await syncToSupabase();
    if (!result.ok) {
      window.alert(result.error);
    } else {
      const entryCount = result.cardEntryCount ?? deck.cards.length;
      const quantity = result.cardQuantity ?? deck.cards.reduce((total, card) => total + card.quantity, 0);
      window.alert(`Deck saved to Supabase (${entryCount} entries / ${quantity} cards).`);
    }
  }, [deck.cards, syncToSupabase]);

  const lastSyncedLabel = useMemo(() => {
    if (!deck.lastSyncedAt) {
      return null;
    }
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(
        new Date(deck.lastSyncedAt),
      );
    } catch {
      return deck.lastSyncedAt;
    }
  }, [deck.lastSyncedAt]);

  const supabaseButtonLabel = useMemo(() => {
    if (isSyncing) {
      return deck.remoteId ? "Syncing..." : "Saving...";
    }
    return deck.remoteId ? "Sync to Supabase" : "Save to Supabase";
  }, [deck.remoteId, isSyncing]);

  const formatDraftTimestamp = useCallback((iso?: string) => {
    if (!iso) {
      return "Recently updated";
    }
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }, []);

  const formattedDrafts = useMemo(
    () =>
      recentDrafts.map((draft) => ({
        ...draft,
        isCurrent: draft.id === deck.id,
        lastUpdatedLabel: formatDraftTimestamp(draft.lastUpdated),
        badge: draft.source === "supabase" ? "Cloud" : "Local",
      })),
    [recentDrafts, deck.id, formatDraftTimestamp],
  );

  const handleLoadDraft = useCallback(
    (draftId: string) => {
      if (draftId === deck.id) {
        return;
      }
      const loaded = loadDraft(draftId);
      if (!loaded) {
        window.alert("We couldn’t open that draft. It may have been removed.");
      }
    },
    [deck.id, loadDraft],
  );

  const handleDeleteDraft = useCallback(
    (draftId: string) => {
      if (!window.confirm("Remove this draft from this device?")) {
        return;
      }
      deleteDraft(draftId);
    },
    [deleteDraft],
  );

  return (
    <div className="bg-[color:var(--color-surface-primary)] min-h-screen pb-16">
      <section className="border-b border-white/10 bg-[color:var(--color-neutral-100)]/80 py-12">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6">
          <nav className="text-xs uppercase tracking-[3px] text-subtle">
            <Link href="/">Home</Link> <span className="mx-2 text-white/40">/</span> Deck Builder (Phase 1 preview)
          </nav>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
            <div className="flex flex-col gap-4">
              <input
                className="w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[color:var(--color-text-hero)] placeholder:text-subtle focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                value={deck.name}
                onChange={(event) => updateDeckMeta({ name: event.target.value })}
                placeholder="Deck name"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex flex-1 items-center gap-2 text-xs uppercase tracking-[2px] text-subtle">
                  <span>Format</span>
                  <select
                    value={deck.format}
                    onChange={(event) => updateDeckMeta({ format: event.target.value })}
                    className="w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--color-text-hero)] focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                  >
                    <option value="commander">Commander</option>
                    <option value="modern">Modern</option>
                    <option value="pioneer">Pioneer</option>
                    <option value="standard">Standard</option>
                    <option value="pauper">Pauper</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs uppercase tracking-[2px] text-subtle">
                  <span>Visibility</span>
                  <select
                    value={deck.visibility}
                    onChange={(event) => updateDeckMeta({ visibility: event.target.value as DeckVisibility })}
                    className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--color-text-hero)] focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                  >
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                  </select>
                </label>
              </div>
              {isImportPanelOpen ? (
                <div className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">Import deck list</h3>
                      <p className="text-xs text-subtle">
                        Paste any quantity + card name list, MTG Arena .txt export, or CSV (quantity,name). We’ll fetch
                        Scryfall data and flag anything that needs manual mapping.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleImportPanelToggle}
                      className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/35"
                    >
                      Close
                    </button>
                  </div>
                  <textarea
                    className="h-32 w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--color-text-hero)] placeholder:text-subtle focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                    placeholder="4 Lightning Bolt\n2 SB: Mystical Dispute\nor paste your MTG Arena .txt export"
                    value={importText}
                    onChange={(event) => {
                      setImportText(event.target.value);
                      setImportFeedback(null);
                      setImportError(null);
                    }}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-[11px] uppercase tracking-[2px] text-subtle">
                      Source
                      <select
                        value={importSource}
                        onChange={(event) => setImportSource(event.target.value as ImportSourceValue)}
                        className="mt-1 w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--color-text-hero)] focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                      >
                        {IMPORT_SOURCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        id="deck-import-file"
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.csv"
                        className="hidden"
                        onChange={handleImportFile}
                      />
                      <button
                        type="button"
                        onClick={handleImportSubmit}
                        disabled={isImporting}
                        className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isImporting ? "Importing..." : "Run import"}
                      </button>
                      <label
                        htmlFor="deck-import-file"
                        className="cursor-pointer rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40"
                      >
                        Upload file
                      </label>
                    </div>
                  </div>
                  {importError ? (
                    <p className="rounded-[var(--radius-control)] border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-[11px] text-[color:var(--color-text-hero)]">
                      {importError}
                    </p>
                  ) : null}
                  {importFeedback && importFeedback.ok ? (
                    <div className="rounded-[var(--radius-control)] border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-[11px] text-[color:var(--color-text-hero)]">
                      <p>
                        Added {importFeedback.added} cards ({importFeedback.matched} matched).
                        {importFeedback.missing.length
                          ? ` ${importFeedback.missing.length} still need manual mapping.`
                          : " All cards resolved."}
                      </p>
                      {importFeedback.missing.length ? (
                        <ul className="mt-1 list-disc pl-4 text-subtle">
                          {importFeedback.missing.map((name) => (
                            <li key={name}>{name}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <aside className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-6 text-xs text-subtle">
              <span className="font-display text-lg text-[color:var(--color-text-hero)]">Draft summary</span>
              <div className="flex items-center justify-between">
                <span>Total cards</span>
                <span className="text-[color:var(--color-text-hero)] font-semibold">{cardCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Distinct cards</span>
                <span className="text-[color:var(--color-text-hero)] font-semibold">{deck.cards.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mainboard</span>
                <span className="text-[color:var(--color-text-hero)] font-semibold">{zoneBreakdown.mainboard}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sideboard</span>
                <span className="text-[color:var(--color-text-hero)] font-semibold">{zoneBreakdown.sideboard}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Commander</span>
                <span className="text-[color:var(--color-text-hero)] font-semibold">{zoneBreakdown.commander}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Unresolved</span>
                <span className="text-[color:var(--color-text-hero)] font-semibold">{zoneBreakdown.unresolved}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {isSupabaseConfigured ? (
                  <button
                    type="button"
                    onClick={handleSupabaseSync}
                    disabled={isSyncing}
                    className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {supabaseButtonLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleImportPanelToggle}
                  className="rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40"
                >
                  Import deck
                </button>
                {EXPORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleExport(option.value)}
                    className="rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40"
                  >
                    Export {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleBridgeDeck}
                  disabled={isBridgingDeck}
                  className="rounded-[var(--radius-pill)] border border-dashed border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] transition-opacity hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBridgingDeck ? "Bridging..." : "Bridge to Card Bazaar"}
                </button>
                <button
                  type="button"
                  onClick={resetDeck}
                  className="rounded-[var(--radius-pill)] border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40"
                >
                  Reset draft
                </button>
              </div>
              {isSupabaseConfigured ? (
                <div className="mt-2 space-y-1 text-[11px] text-subtle">
                  <p>
                    {deck.remoteId
                      ? lastSyncedLabel
                        ? "Cloud copy updated " + lastSyncedLabel + "."
                        : "Cloud copy ready. Sync whenever you update the list."
                      : "Save this draft to Supabase to keep a cloud backup."}
                  </p>
                  {syncError ? (
                    <p className="text-rose-300">Last sync failed: {syncError}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-subtle">
                  Drafts save locally today. Configure Supabase to enable cloud persistence.
                </p>
              )}
              {bridgeMessage ? (
                <p className="rounded-[var(--radius-control)] border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-[11px] text-[color:var(--color-text-hero)]">
                  {bridgeMessage}
                  {bridgeSummary ? <span className="block text-subtle">{bridgeSummary}</span> : null}
                </p>
              ) : null}
              {bridgeError ? (
                <p className="rounded-[var(--radius-control)] border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-[11px] text-[color:var(--color-text-hero)]">
                  {bridgeError}
                </p>
              ) : null}
              {bridgeMissing.length ? (
                <div className="rounded-[var(--radius-control)] border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-[11px] text-[color:var(--color-text-hero)]">
                  <p className="font-semibold">Needs manual mapping</p>
                  <ul className="mt-1 list-disc pl-4">
                    {bridgeMissing.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-4 space-y-2">
                <h3 className="text-[11px] uppercase tracking-[2px] text-subtle">Recent drafts</h3>
                {formattedDrafts.length ? (
                  <ul className="space-y-2">
                    {formattedDrafts.map((draft) => (
                      <li
                        key={draft.id}
                        className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[color:var(--color-text-hero)]">{draft.name}</p>
                            <p className="text-[10px] uppercase tracking-[1.5px] text-subtle">
                              {draft.format} · {draft.badge} draft · {draft.lastUpdatedLabel}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleLoadDraft(draft.id)}
                              disabled={draft.isCurrent}
                              className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {draft.isCurrent ? "Current" : "Resume"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDraft(draft.id)}
                              className="rounded-[var(--radius-pill)] border border-rose-500/40 px-3 py-1 text-[10px] uppercase tracking-[2px] text-rose-200 hover:border-rose-300/60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-subtle">
                    Drafts you open will appear here so you can jump back later. We keep the last ten.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[color:var(--color-neutral-100)]/40 py-10">
        <div className="mx-auto flex w/full max-w-[1240px] flex-col gap-6 px-6">
          <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Your current draft</h2>
          {deck.cards.length === 0 ? (
            <p className="rounded-[var(--radius-control)] border border-dashed border-white/20 bg-white/5 p-4 text-sm text-subtle">
              No cards added yet. Search below and tap “Add to deck” to start building.
            </p>
          ) : (
            <table className="min-w-full overflow-hidden rounded-[var(--radius-card)] border border-white/10 text-sm text-subtle">
              <thead className="bg-white/5 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
                <tr>
                  <th className="px-4 py-3 text-left">Quantity</th>
                  <th className="px-4 py-3 text-left">Card</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Zone</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deck.cards.map((card) => (
                  <tr key={card.cardId} className="border-t border-white/10">
                    <td className="px-4 py-3 text-[color:var(--color-text-hero)]">{card.quantity}</td>
                    <td className="px-4 py-3 text-[color:var(--color-text-hero)]">
                      <div className="flex flex-col">
                        <span className="font-semibold">{card.name}</span>
                        {card.manaCost ? (
                          <span className="text-[11px] text-subtle">{card.manaCost}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">{card.typeLine ?? "—"}</td>
                    <td className="px-4 py-3 capitalize">{card.zone ?? "mainboard"}</td>
                    <td className="px-4 py-3">
                      {card.resolved === false ? (
                        <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-amber-200">
                          Needs mapping
                        </span>
                      ) : (
                        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] text-emerald-200">
                          Resolved
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => addCard(card)}
                          className="rounded-[var(--radius-pill)] border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/35"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => decrementCard(card.cardId)}
                          className="rounded-[var(--radius-pill)] border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/35"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCard(card.cardId)}
                          className="rounded-[var(--radius-pill)] border border-rose-500/40 px-3 py-1 text-[11px] uppercase tracking-[2px] text-rose-200 hover:border-rose-300/60"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto flex w/full max-w-[1240px] flex-col gap-8 px-6">
          <header className="flex flex-col gap-2">
            <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Search cards</h2>
            <p className="text-sm text-subtle">
              Live results come straight from Scryfall. Add cards to your draft to test the deck builder instrumentation.
            </p>
          </header>

          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="sr-only">Card search</span>
              <input
                className="w-full rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-4 py-3 text-sm text-[color:var(--color-text-hero)] placeholder:text-subtle focus:border-[color:var(--color-accent-highlight)] focus:outline-none"
                placeholder="Search Scryfall syntax (e.g. type:creature t:legendary)"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-6 py-3 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)]"
            >
              Search
            </button>
          </form>

          {error ? (
            <div className="rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-[color:var(--color-text-hero)]">
              Failed to load cards: {error.message}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading && cards.length === 0
              ? Array.from({ length: 6 }).map((_, index) => (
                  <article
                    key={`card-skeleton-${index}`}
                    className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-4 animate-pulse"
                  >
                    <div className="h-[140px] rounded-[12px] bg-white/10" />
                    <div className="h-4 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/5" />
                    <div className="h-8 w-full rounded bg-white/5" />
                  </article>
                ))
              : cards.map((card) => (
                  <article
                    key={card.id}
                    className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">{card.name}</h3>
                        <p className="text-[11px] uppercase tracking-[3px] text-subtle">{card.type_line}</p>
                      </div>
                      <span className="rounded-full bg-[color:var(--color-accent-highlight)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
                        {card.set_name ?? card.set}
                      </span>
                    </div>
                    <p className="text-xs text-subtle">
                      {card.mana_cost ?? ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddCard(card)}
                      className="gradient-pill shadow-cta mt-auto rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]"
                    >
                      Add to deck
                    </button>
                  </article>
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDraftDeck } from "@/hooks/use-draft-deck";
import { useScryfallSearch } from "@/hooks/use-scryfall-search";
import { useRecommendations, type RecommendationSeed, type UseRecommendationsResult } from "@/hooks/use-recommendations";
import { mapRecommendationSource } from "@/lib/recommendation-utils";
import { trackAutofillAction, trackRecommendationServed } from "@/lib/telemetry";
import { fetchCardById } from "@/services/scryfall";
import type { ScryfallCard } from "@/services/scryfall";
import type { AutofillSuggestion } from "@/services/autofill";
import { initiateCardBazaarBridge } from "@/services/card-bazaar-bridge";

const DEFAULT_QUERY = "game:paper";

const KRRIRK_SEED_STORAGE_KEY = "metablazt.seed.krrik";
const KRRIRK_DECK_NAME = "K'rrik Devotion";
const KRRIRK_SEED_LIST = `1 K'rrik, Son of Yawgmoth
1 Urborg, Tomb of Yawgmoth
1 Cabal Stronghold
1 Castle Locthwain
1 Phyrexian Tower
1 Takenuma, Abandoned Mire
1 Chrome Mox
1 Ancient Tomb
1 Arch of Orazca
1 Nykthos, Shrine to Nyx
1 Bloodchief's Thirst
1 Dark Ritual
1 Cut Down
1 Fatal Push
1 Inquisition of Kozilek
1 Insatiable Avarice
1 Thoughtseize
1 Village Rites
1 Bitterblossom
1 Bitter Triumph
1 Deadly Dispute
1 Dark Confidant
1 Dreadhorde Invasion
1 Jadar, Ghoulcaller of Nephalia
1 Sign in Blood
1 Sheoldred's Edict
1 Arcane Signet
1 Jet Medallion
1 Mind Stone
1 The Irencrag
1 Black Market Connections
1 Liliana of the Veil
1 Lord Skitter, Sewer King
1 Necropotence
1 Phyrexian Arena
1 Ophiomancer
1 Toxic Deluge
1 Damnation
1 Sheoldred, the Apocalypse
1 Lolth, Spider Queen
1 Liliana, Dreadhorde General
1 Vraska, Betrayal's Sting
1 Ardyn, the Usurper
1 Griselbrand
1 Reanimate
1 Baleful Mastery
1 Witch's Cottage
1 Crux of Fate
1 Liliana, Death's Majesty
31 Swamp
1 Exsanguinate
1 Torment of Hailfire
1 Gix, Yawgmoth Praetor
1 Gray Merchant of Asphodel
1 Bolas's Citadel
1 Breach the Multiverse
1 Mox Amber
1 Liliana, Waker of the Dead
1 Sorin the Mirthless
1 Professor Onyx
1 The Cruelty of Gix
1 Duress
1 Beseech the Mirror
1 Phyrexian Obliterator
1 Outrageous Robbery
1 Languish
1 Feed the Cycle
1 Cruelclaw's Heist
1 Gifted Aetherborn
1 Massacre Wurm`;

const COLOR_LABELS: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

type AutofillStatus = "idle" | "loading" | "success" | "error";

type AutofillMeta = {
  deckId: string | null;
  deckName: string | null;
  format: string | null;
  colors: string[] | null;
  count: number;
};

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

function DeckBuilderPageInner() {
  const [searchInput, setSearchInput] = useState(DEFAULT_QUERY);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [linkFeedback, setLinkFeedback] = useState<string | null>(null);
  const [linkFeedbackTone, setLinkFeedbackTone] = useState<"success" | "error">("success");
  const [isProcessingLink, setIsProcessingLink] = useState(false);

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

  const [autofillStatus, setAutofillStatus] = useState<AutofillStatus>("idle");
  const [autofillSuggestions, setAutofillSuggestions] = useState<AutofillSuggestion[]>([]);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [autofillMeta, setAutofillMeta] = useState<AutofillMeta | null>(null);
  const [isAddingAllSuggestions, setIsAddingAllSuggestions] = useState(false);

  const { data, isLoading, error, updateParams } = useScryfallSearch({ initialQuery: DEFAULT_QUERY });

  const cards = useMemo<ScryfallCard[]>(() => data?.data ?? [], [data]);
  const {
    seeds: recommendationSeeds,
    meta: recommendationsMeta,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refresh: refreshRecommendations,
  } = useRecommendations({
    scope: "card",
    surface: "deck_builder",
    format: deck.format ? deck.format.trim().toLowerCase() : null,
    limit: 6,
  });

  const cardRecommendations = useMemo(
    () => recommendationSeeds.filter(isCardRecommendationSeed),
    [recommendationSeeds],
  );

  const servedRecommendationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!linkFeedback) {
      return;
    }
    const timer = window.setTimeout(() => setLinkFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [linkFeedback]);

  useEffect(() => {
    cardRecommendations.forEach((seed) => {
      if (servedRecommendationIdsRef.current.has(seed.id)) {
        return;
      }
      trackRecommendationServed({
        recommendationId: seed.id,
        surface: "deck_builder",
        algorithm: mapRecommendationSource(seed.source),
      });
      servedRecommendationIdsRef.current.add(seed.id);
    });
  }, [cardRecommendations]);

  const handleAddRecommendedCard = useCallback(
    (seed: CardRecommendationSeed) => {
      const { card: cardEntity } = seed.entity;
      addCard({
        cardId: cardEntity.id,
        name: cardEntity.name,
        manaCost: cardEntity.manaCost,
        typeLine: cardEntity.typeLine ?? null,
        imageUrl: cardEntity.image ?? null,
        method: "suggestion",
      });
    },
    [addCard],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (deck.cards.length > 0) {
      return;
    }
    if (window.localStorage.getItem(KRRIRK_SEED_STORAGE_KEY)) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await importFromList(KRRIRK_SEED_LIST, "manual_list");
        if (!cancelled && result?.ok) {
          updateDeckMeta({
            name: KRRIRK_DECK_NAME,
            format: "commander",
            visibility: deck.visibility,
          });
          window.localStorage.setItem(KRRIRK_SEED_STORAGE_KEY, "true");
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to seed K'rrik deck", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deck.cards.length, deck.visibility, importFromList, updateDeckMeta]);

  const mainboardCards = useMemo(
    () => deck.cards.filter((card) => (card.zone ?? "mainboard") === "mainboard" && card.quantity > 0),
    [deck.cards],
  );

  const deckColorPalette = useMemo(() => {
    const symbols = new Set<string>();
    mainboardCards.forEach((card) => {
      const cost = card.manaCost ?? "";
      for (const char of cost) {
        if ("WUBRG".includes(char)) {
          symbols.add(char);
        }
      }
    });
    return symbols.size ? Array.from(symbols) : null;
  }, [mainboardCards]);

  const hasMainboardCards = mainboardCards.length > 0;

  const handleGenerateAutofill = useCallback(async () => {
    if (!hasMainboardCards) {
      setAutofillStatus("error");
      setAutofillError("Add mainboard cards before generating suggestions.");
      setAutofillSuggestions([]);
      setAutofillMeta(null);
      return;
    }

    setAutofillStatus("loading");
    setAutofillError(null);
    setAutofillSuggestions([]);
    setAutofillMeta(null);

    trackAutofillAction({ action: "requested", deckId: deck.id, suggestionCount: undefined });

    try {
      const requestCards = mainboardCards.map((card) => ({
        cardId: card.cardId,
        name: card.name,
        quantity: card.quantity,
      }));

      const response = await fetch("/api/autofill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deckId: deck.id,
          deckName: deck.name,
          format: deck.format,
          colors: deckColorPalette,
          cards: requestCards,
          limit: 6,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload === "object" && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Unable to compute suggestions right now.";
        setAutofillStatus("error");
        setAutofillError(message);
        return;
      }

      const payload = await response.json();
      const suggestions: AutofillSuggestion[] = Array.isArray(payload?.data) ? payload.data : [];
      setAutofillSuggestions(suggestions);
      setAutofillStatus("success");

      if (payload?.meta && typeof payload.meta === "object") {
        setAutofillMeta({
          deckId: typeof payload.meta.deckId === "string" ? payload.meta.deckId : null,
          deckName: typeof payload.meta.deckName === "string" ? payload.meta.deckName : null,
          format: typeof payload.meta.format === "string" ? payload.meta.format : null,
          colors: Array.isArray(payload.meta.colors)
            ? payload.meta.colors.filter((entry: unknown): entry is string => typeof entry === "string")
            : null,
          count: typeof payload.meta.count === "number" ? payload.meta.count : suggestions.length,
        });
      } else {
        setAutofillMeta({
          deckId: deck.id,
          deckName: deck.name,
          format: deck.format,
          colors: deckColorPalette,
          count: suggestions.length,
        });
      }

      trackAutofillAction({ action: "received", deckId: deck.id, suggestionCount: suggestions.length });
    } catch (error) {
      console.warn("Autofill request failed", error);
      setAutofillStatus("error");
      setAutofillError("Unable to compute suggestions right now. Please try again soon.");
    }
  }, [deck.id, deck.name, deck.format, deckColorPalette, hasMainboardCards, mainboardCards]);

  const handleAddAutofillSuggestion = useCallback(
    (suggestion: AutofillSuggestion) => {
      addCard({
        cardId: suggestion.cardId,
        name: suggestion.name,
        manaCost: suggestion.manaCost,
        typeLine: suggestion.typeLine,
        imageUrl: suggestion.image ?? null,
        method: "suggestion",
      });

      trackAutofillAction({ action: "added", deckId: deck.id, suggestionCount: 1 });

      let nextSuggestions: AutofillSuggestion[] = [];
      setAutofillSuggestions((current) => {
        nextSuggestions = current.filter((item) => item.seedId !== suggestion.seedId);
        return nextSuggestions;
      });
      setAutofillMeta((current) => (current ? { ...current, count: nextSuggestions.length } : current));
      setAutofillStatus("success");
    },
    [addCard, deck.id],
  );

  const handleAddAllAutofillSuggestions = useCallback(() => {
    if (!autofillSuggestions.length) {
      return;
    }

    setIsAddingAllSuggestions(true);
    try {
      autofillSuggestions.forEach((suggestion) => {
        addCard({
          cardId: suggestion.cardId,
          name: suggestion.name,
          manaCost: suggestion.manaCost,
          typeLine: suggestion.typeLine,
          imageUrl: suggestion.image ?? null,
          method: "suggestion",
        });
      });

      trackAutofillAction({ action: "add_all", deckId: deck.id, suggestionCount: autofillSuggestions.length });
      setAutofillSuggestions([]);
      setAutofillMeta((current) => (current ? { ...current, count: 0 } : current));
      setAutofillStatus("success");
    } finally {
      setIsAddingAllSuggestions(false);
    }
  }, [addCard, autofillSuggestions, deck.id]);

  const handleDismissAutofill = useCallback(() => {
    let dismissedCount = 0;
    setAutofillSuggestions((current) => {
      dismissedCount = current.length;
      return [];
    });
    setAutofillStatus("idle");
    setAutofillError(null);
    setAutofillMeta(null);
    trackAutofillAction({ action: "dismissed", deckId: deck.id, suggestionCount: dismissedCount });
  }, [deck.id]);

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
    (draftId: string, options: { quiet?: boolean } = {}) => {
      if (!draftId || draftId === deck.id) {
        return false;
      }
      const loaded = loadDraft(draftId);
      if (!loaded) {
        if (!options.quiet) {
          setLinkFeedbackTone("error");
          setLinkFeedback("We couldn't open that draft. It may have been removed.");
        }
        return false;
      }
      if (!options.quiet) {
        setLinkFeedbackTone("success");
        setLinkFeedback("Loaded deck from your library.");
      }
      return true;
    },
    [deck.id, loadDraft],
  );

  const handleDeleteDraft = useCallback(
    (draftId: string) => {
      if (!window.confirm("Remove this draft from this device?")) {
        return;
      }
      deleteDraft(draftId);
      setLinkFeedbackTone("success");
      setLinkFeedback("Deck removed from this device.");
    },
    [deleteDraft],
  );

  const handleCreateDeck = useCallback(() => {
    resetDeck();
    setLinkFeedbackTone("success");
    setLinkFeedback("Started a new deck draft.");
  }, [resetDeck]);

  useEffect(() => {
    const deckParam = searchParams?.get("deck");
    const newParam = searchParams?.get("new");
    const addParam = searchParams?.get("add");

    if (!deckParam && !newParam && !addParam) {
      return;
    }

    const next = new URLSearchParams(searchParams?.toString() ?? "");
    let shouldReplace = false;

    if (deckParam) {
      const loaded = handleLoadDraft(deckParam, { quiet: true });
      if (!loaded) {
        setLinkFeedbackTone("error");
        setLinkFeedback("We couldn't open that draft. It may have been removed.");
      } else {
        setLinkFeedbackTone("success");
        setLinkFeedback("Loaded deck from your library.");
      }
      next.delete("deck");
      shouldReplace = true;
    }

    if (newParam !== null && typeof newParam !== "undefined") {
      resetDeck();
      setLinkFeedbackTone("success");
      setLinkFeedback("Started a new deck draft.");
      next.delete("new");
      shouldReplace = true;
    }

    if (addParam) {
      setIsProcessingLink(true);
      const safeCardId = addParam;
      (async () => {
        try {
          const card = await fetchCardById(safeCardId);
          addCard({
            cardId: card.id,
            name: card.name,
            manaCost: card.mana_cost,
            typeLine: card.type_line,
            imageUrl: card.image_uris?.small ?? card.image_uris?.normal ?? null,
          });
          setLinkFeedbackTone("success");
          setLinkFeedback(`Added ${card.name} to your deck.`);
        } catch (error) {
          console.warn("Failed to add catalog card", error);
          setLinkFeedbackTone("error");
          setLinkFeedback("We couldn't add that card from Scryfall. Try again from the catalog.");
        } finally {
          setIsProcessingLink(false);
        }
      })();
      next.delete("add");
      shouldReplace = true;
    }

    if (shouldReplace) {
      const query = next.toString();
      router.replace(query ? `/deckbuilder?${query}` : "/deckbuilder", { scroll: false });
    }
  }, [addCard, handleLoadDraft, resetDeck, router, searchParams]);

  return (
    <div className="bg-[color:var(--color-surface-primary)] min-h-screen pb-16">
      <section className="border-b border-white/10 bg-[color:var(--color-neutral-100)]/80 py-12">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6">
          <nav className="text-xs uppercase tracking-[3px] text-subtle">
            <Link href="/">Home</Link> <span className="mx-2 text-white/40">/</span> Deck Builder (Phase 1 preview)
          </nav>
          <div className="grid gap-6 lg:grid-cols-[260px,minmax(0,1fr),320px]">
            <DeckLibraryPanel
              drafts={formattedDrafts}
              onCreateDeck={handleCreateDeck}
              onResumeDraft={handleLoadDraft}
              onDeleteDraft={handleDeleteDraft}
              isProcessingLink={isProcessingLink}
            />
            <div className="flex flex-col gap-4">
              {linkFeedback ? (
                <div
                  className={`rounded-[var(--radius-control)] border px-4 py-3 text-sm ${
                    linkFeedbackTone === "success"
                      ? "border-emerald-400/40 bg-emerald-500/15 text-[color:var(--color-text-hero)]"
                      : "border-rose-500/40 bg-rose-500/15 text-[color:var(--color-text-hero)]"
                  }`}
                >
                  {linkFeedback}
                </div>
              ) : null}

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
                        Paste any quantity + card name list, MTG Arena .txt export, or CSV (quantity,name). We will fetch
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
                <Link
                  href="/deckbuilder/simulator"
                  className="gradient-pill shadow-cta rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]"
                >
                  Open simulator
                </Link>
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
            </aside>
          </div>
        </div>
      </section>

      <RecommendationsSection
        seeds={cardRecommendations}
        meta={recommendationsMeta}
        isLoading={isLoadingRecommendations}
        error={recommendationsError}
        onRefresh={refreshRecommendations}
        onAdd={handleAddRecommendedCard}
      />

      <AutofillSection
        status={autofillStatus}
        suggestions={autofillSuggestions}
        error={autofillError}
        isGenerating={autofillStatus === "loading"}
        isAddingAll={isAddingAllSuggestions}
        hasMainboard={hasMainboardCards}
        meta={autofillMeta}
        onGenerate={handleGenerateAutofill}
        onAdd={handleAddAutofillSuggestion}
        onAddAll={handleAddAllAutofillSuggestions}
        onClear={handleDismissAutofill}
      />

      <section className="border-b border-white/10 bg-[color:var(--color-neutral-100)]/40 py-10">
        <div className="mx-auto flex w/full max-w-[1240px] flex-col gap-6 px-6">
          <h2 className="font-display text-2xl text-[color:var(--color-text-hero)]">Your current draft</h2>
          {deck.cards.length === 0 ? (
            <p className="rounded-[var(--radius-control)] border border-dashed border-white/20 bg-white/5 p-4 text-sm text-subtle">
              No cards added yet. Search below and tap Add to deck to start building.
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
                    <td className="px-4 py-3">{card.typeLine ?? "-"}</td>
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










export default function DeckBuilderPage() {
  return (
    <Suspense fallback={<DeckBuilderPageFallback />}>
      <DeckBuilderPageInner />
    </Suspense>
  );
}

function DeckBuilderPageFallback() {
  return <div className="bg-[color:var(--color-surface-primary)] min-h-screen" />;
}

type DeckLibraryPanelProps = {
  drafts: Array<{
    id: string;
    name: string;
    format: string;
    badge: string;
    lastUpdatedLabel: string;
    isCurrent: boolean;
  }>;
  onCreateDeck: () => void;
  onResumeDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  isProcessingLink: boolean;
};

function DeckLibraryPanel({ drafts, onCreateDeck, onResumeDraft, onDeleteDraft, isProcessingLink }: DeckLibraryPanelProps) {
  return (
    <aside className="surface-card shadow-card flex h-fit flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-5 text-sm text-subtle">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg text-[color:var(--color-text-hero)]">Deck library</span>
        <button
          type="button"
          onClick={onCreateDeck}
          className="rounded-[var(--radius-pill)] border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] hover:border-white/40"
        >
          New deck
        </button>
      </div>
      {isProcessingLink ? (
        <p className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-[color:var(--color-text-hero)]">
          Adding card from your catalog selection...
        </p>
      ) : null}
      {drafts.length ? (
        <ul className="space-y-2">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-semibold text-[color:var(--color-text-hero)]">{draft.name}</p>
                  <p className="text-[10px] uppercase tracking-[1.5px] text-subtle">
                    {draft.format} - {draft.badge} - {draft.lastUpdatedLabel}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-[10px] uppercase tracking-[2px]">
                  <button
                    type="button"
                    onClick={() => onResumeDraft(draft.id)}
                    disabled={draft.isCurrent}
                    className="rounded-[var(--radius-pill)] border border-white/20 px-2 py-1 text-[color:var(--color-text-body)] hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {draft.isCurrent ? "Current" : "Open"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDraft(draft.id)}
                    className="rounded-[var(--radius-pill)] border border-rose-500/40 px-2 py-1 text-rose-200 hover:border-rose-300/60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[var(--radius-control)] border border-dashed border-white/20 bg-white/5 px-3 py-2 text-[11px] text-subtle">
          Drafts you save will appear here for quick access. We keep the last ten on this device.
        </p>
      )}
    </aside>
  );
}

type CardRecommendationSeed = RecommendationSeed & {
  entity: {
    type: "card";
    card: {
      id: string;
      name: string;
      setCode: string;
      rarity: string;
      manaCost: string | null;
      typeLine: string | null;
      image: string | null;
      colorIdentity: string[];
    };
  };
};

type RecommendationsSectionProps = {
  seeds: CardRecommendationSeed[];
  meta: UseRecommendationsResult["meta"];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onAdd: (seed: CardRecommendationSeed) => void;
};

function RecommendationsSection({ seeds, meta, isLoading, error, onRefresh, onAdd }: RecommendationsSectionProps) {
  const isFallback = meta?.resolver?.startsWith("fallback") ?? false;
  const formatLabel = meta?.format ? meta.format.toUpperCase() : "All formats";
  const resolverLabel = meta?.resolver ? formatResolver(meta.resolver) : "";

  return (
    <section className="border-y border-white/10 bg-[color:var(--color-neutral-200)]/15 py-12">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
              Suggested additions
            </p>
            <h2 className="font-display text-2xl text-[color:var(--color-text-hero)] sm:text-3xl">
              Recommendations tuned to your deck draft
            </h2>
            <p className="max-w-3xl text-sm text-subtle">
              These picks blend trending cards, similar shells, and fallback curation so the builder always gives you
              something to test.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[2px] text-subtle">
              <StatusPill tone={isFallback ? "warning" : "success"}>
                {isFallback ? "Curated fallback seeds" : "Powered by Supabase metrics"}
              </StatusPill>
              <StatusPill tone="neutral">{formatLabel}</StatusPill>
              {resolverLabel ? <StatusPill tone="neutral">Resolver: {resolverLabel}</StatusPill> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="gradient-pill shadow-cta inline-flex items-center justify-center rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px]"
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh suggestions"}
          </button>
        </header>

        {error ? (
          <div className="rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-[color:var(--color-text-hero)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {isLoading && seeds.length === 0
            ? Array.from({ length: 6 }).map((_, index) => (
                <article
                  key={`deck-recommendation-skeleton-${index}`}
                  className="surface-card shadow-card flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 p-4 animate-pulse"
                >
                  <div className="h-[140px] rounded-[14px] bg-white/10" />
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                  <div className="h-8 w-full rounded bg-white/5" />
                </article>
              ))
            : seeds.map((seed) => (
                <RecommendationCardTile key={seed.id} seed={seed} onAdd={onAdd} />
              ))}
        </div>

        {!isLoading && !seeds.length && !error ? (
          <p className="rounded-[var(--radius-control)] border border-white/10 bg-white/5 p-4 text-sm text-subtle">
            Recommendations will appear as soon as we have more activity for this format.
          </p>
        ) : null}
      </div>
    </section>
  );
}

type AutofillSectionProps = {
  status: AutofillStatus;
  suggestions: AutofillSuggestion[];
  error: string | null;
  isGenerating: boolean;
  isAddingAll: boolean;
  hasMainboard: boolean;
  meta: AutofillMeta | null;
  onGenerate: () => void;
  onAdd: (suggestion: AutofillSuggestion) => void;
  onAddAll: () => void;
  onClear: () => void;
};

function AutofillSection({
  status,
  suggestions,
  error,
  isGenerating,
  isAddingAll,
  hasMainboard,
  meta,
  onGenerate,
  onAdd,
  onAddAll,
  onClear,
}: AutofillSectionProps) {
  const hasSuggestions = suggestions.length > 0;
  const hasError = Boolean(error);
  const colorsLabel = formatColorIdentitySymbols(meta?.colors);
  const showClear = hasSuggestions || hasError;

  return (
    <section className="border-b border-white/10 bg-[color:var(--color-neutral-200)]/20 py-12">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[6px] text-[color:var(--color-accent-highlight)]">
              Autofill prototype
            </p>
            <h2 className="font-display text-3xl text-[color:var(--color-text-hero)] sm:text-4xl">
              Boost your mainboard
            </h2>
            <p className="max-w-3xl text-sm text-subtle">
              Generate quick additions from trending data and archetype matches. Well keep tuning this once personalization jobs land.
            </p>
            {meta ? (
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[2px] text-subtle">
                <StatusPill tone="neutral">
                  Deck  {meta.deckName ?? "Active draft"}
                </StatusPill>
                {meta.format ? <StatusPill tone="neutral">Format  {meta.format}</StatusPill> : null}
                {colorsLabel ? <StatusPill tone="neutral">Colors  {colorsLabel}</StatusPill> : null}
                <StatusPill tone="success">Suggestions  {meta.count}</StatusPill>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onGenerate}
              className="gradient-pill shadow-cta inline-flex items-center justify-center rounded-[var(--radius-pill)] px-5 py-2 text-xs font-semibold uppercase tracking-[3px] text-[color:var(--color-text-hero)] transition-transform hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGenerating || !hasMainboard}
            >
              {isGenerating ? "Generating..." : "Generate suggestions"}
            </button>
            {hasSuggestions ? (
              <button
                type="button"
                onClick={onAddAll}
                className="rounded-[var(--radius-pill)] border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)] transition-colors hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isGenerating || isAddingAll}
              >
                {isAddingAll ? "Adding..." : "Add all"}
              </button>
            ) : null}
            {showClear ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-[var(--radius-pill)] border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-body)] transition-colors hover:border-white/35 disabled:opacity-60"
                disabled={isGenerating}
              >
                Clear
              </button>
            ) : null}
          </div>
        </header>

        {!hasMainboard && !hasSuggestions && !hasError && !isGenerating ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-white/15 bg-white/5 p-4 text-sm text-subtle">
            Add a few mainboard cards, then run the autofill prototype to see recommended pickups.
          </div>
        ) : null}

        {hasError ? (
          <div className="rounded-[var(--radius-card)] border border-rose-500/40 bg-rose-900/20 p-4 text-sm text-[color:var(--color-text-hero)]">
            {error}
          </div>
        ) : null}

        {isGenerating ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <article
                key={`autofill-skeleton-${index}`}
                className="surface-card shadow-card flex flex-col gap-4 rounded-[var(--radius-card)] border border-white/10 p-4 animate-pulse"
              >
                <div className="h-[140px] rounded-[14px] bg-white/10" />
                <div className="h-4 w-3/4 rounded bg-white/15" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
                <div className="h-8 w-full rounded bg-white/5" />
              </article>
            ))}
          </div>
        ) : null}

        {!isGenerating && hasSuggestions ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {suggestions.map((suggestion) => (
              <AutofillSuggestionTile key={suggestion.seedId} suggestion={suggestion} onAdd={onAdd} />
            ))}
          </div>
        ) : null}

        {!isGenerating && !hasSuggestions && status === "success" && !hasError ? (
          <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4 text-sm text-subtle">
            We didnt find new suggestions yet. Try adjusting your list or format and run autofill again.
          </div>
        ) : null}
      </div>
    </section>
  );
}

type AutofillSuggestionTileProps = {
  suggestion: AutofillSuggestion;
  onAdd: (suggestion: AutofillSuggestion) => void;
};

function AutofillSuggestionTile({ suggestion, onAdd }: AutofillSuggestionTileProps) {
  const identity = formatColorIdentitySymbols(suggestion.colorIdentity) ?? "Colorless";
  const sourceLabel = formatAutofillSource(suggestion.source);

  return (
    <article className="surface-card hover:shadow-xl flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4 transition-transform duration-150 hover:-translate-y-[2px]">
      <div className="relative h-[140px] overflow-hidden rounded-[14px] border border-white/10 bg-[color:var(--color-neutral-200)]/20">
        {suggestion.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={suggestion.image} alt={suggestion.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[3px] text-subtle">
            No art
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
          {sourceLabel}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">{suggestion.name}</h3>
        <p className="text-[11px] uppercase tracking-[3px] text-subtle">{identity}</p>
        {suggestion.typeLine ? <p className="text-[11px] text-subtle">{suggestion.typeLine}</p> : null}
      </div>
      <p className="text-xs text-subtle">{suggestion.reason}</p>
      <dl className="grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[2px] text-subtle">
        <div>
          <dt className="text-xs text-[color:var(--color-accent-highlight)]">Mana</dt>
          <dd className="text-[color:var(--color-text-hero)] font-semibold">{suggestion.manaCost ?? "--"}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--color-accent-highlight)]">Set</dt>
          <dd>{suggestion.setCode}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => onAdd(suggestion)}
        className="gradient-pill shadow-cta mt-auto rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]"
      >
        Add to deck
      </button>
    </article>
  );
}

function formatColorIdentitySymbols(symbols?: string[] | null): string | null {
  if (!symbols || symbols.length === 0) {
    return null;
  }
  return symbols.map((symbol) => COLOR_LABELS[symbol] ?? symbol).join(" / ");
}

function formatAutofillSource(source: AutofillSuggestion["source"]): string {
  switch (source) {
    case "trending":
      return "Trending";
    case "similar":
      return "Similar";
    case "fallback":
      return "Fallback";
    default:
      return source;
  }
}

type RecommendationCardTileProps = {
  seed: CardRecommendationSeed;
  onAdd: (seed: CardRecommendationSeed) => void;
};

function RecommendationCardTile({ seed, onAdd }: RecommendationCardTileProps) {
  const card = seed.entity.card;
  const imageSrc = card.image ?? undefined;
  const identity = card.colorIdentity.length ? card.colorIdentity.join(" / ") : "Colorless";
  const trendScoreLabel = typeof seed.trendScore === "number" ? seed.trendScore.toFixed(1) : "--";
  const algorithm = formatResolver(mapRecommendationSource(seed.source));

  return (
    <article className="surface-card hover:shadow-xl flex flex-col gap-3 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-4 transition-transform duration-150 hover:-translate-y-[2px]">
      <div className="relative h-[140px] overflow-hidden rounded-[14px] border border-white/10 bg-[color:var(--color-neutral-200)]/20">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={card.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[3px] text-subtle">
            No art
          </div>
        )}
        {seed.rank ? (
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[2px] text-[color:var(--color-text-hero)]">
            Rank {seed.rank}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg text-[color:var(--color-text-hero)]">{card.name}</h3>
        <p className="text-[11px] uppercase tracking-[3px] text-subtle">
          {card.setCode}  |  {identity}
        </p>
      </div>
      <p className="text-xs text-subtle">{seed.reason}</p>
      <dl className="grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[2px] text-subtle">
        <div>
          <dt className="text-xs text-[color:var(--color-accent-highlight)]">Trend score</dt>
          <dd className="text-[color:var(--color-text-hero)] font-semibold">{trendScoreLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--color-accent-highlight)]">Source</dt>
          <dd>{algorithm}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => onAdd(seed)}
        className="gradient-pill shadow-cta mt-auto rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-[color:var(--color-text-hero)]"
      >
        Add to deck
      </button>
    </article>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "neutral" | "success" | "warning" }) {
  const styles: Record<"neutral" | "success" | "warning", string> = {
    neutral: "border-white/20 bg-white/10 text-[color:var(--color-text-body)]",
    success: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
    warning: "border-amber-300/50 bg-amber-500/20 text-amber-100",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[2px] ${styles[tone]}`}>
      {children}
    </span>
  );
}

function formatResolver(resolver: string): string {
  switch (resolver) {
    case "similar":
    case "similar_card":
    case "similar_cards":
      return "Similar cards";
    case "trending":
    case "fallback-trending":
      return "Trending";
    case "deck-upgrades":
      return "Deck upgrades";
    case "static-fallback":
      return "Static fallback";
    default:
      return resolver.replace(/_/g, " ");
  }
}

function isCardRecommendationSeed(seed: RecommendationSeed): seed is CardRecommendationSeed {
  return Boolean(seed.entity && seed.entity.type === "card" && (seed.entity as { card?: unknown }).card);
}




































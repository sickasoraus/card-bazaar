"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  trackDeckCardAdded,
  trackDeckCreated,
  trackExportCompleted,
  trackImportAttempted,
} from "@/lib/telemetry";

type DeckVisibility = "private" | "unlisted" | "public";

type DraftCard = {
  cardId: string;
  name: string;
  manaCost?: string | null;
  typeLine?: string | null;
  imageUrl?: string | null;
  quantity: number;
};

type DraftDeck = {
  id: string;
  remoteId?: string | null;
  name: string;
  format: string;
  visibility: DeckVisibility;
  cards: DraftCard[];
  lastUpdated: string;
  lastSyncedAt?: string | null;
  source: "local" | "supabase";
};

export type DraftIndexEntry = {
  id: string;
  name: string;
  format: string;
  lastUpdated: string;
  source: DraftDeck["source"];
};

const LEGACY_STORAGE_KEY = "metablazt:draft:current";
const INDEX_KEY = "metablazt:draft:index";
const LATEST_KEY = "metablazt:draft:latest";
const DRAFT_KEY_PREFIX = "metablazt:draft:";
const HISTORY_LIMIT = 10;
const LOCAL_DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const DEFAULT_DECK_NAME = "Untitled Draft";
const DEFAULT_FORMAT = "commander";

const SUPABASE_ENABLED =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const generateId = (prefix = "deck") =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

const nowIso = () => new Date().toISOString();

const draftStorageKey = (deckId: string) => `${DRAFT_KEY_PREFIX}${deckId}`;

function createInitialDeck(): DraftDeck {
  const timestamp = nowIso();
  return {
    id: generateId(),
    remoteId: null,
    name: DEFAULT_DECK_NAME,
    format: DEFAULT_FORMAT,
    visibility: "private",
    cards: [],
    lastUpdated: timestamp,
    lastSyncedAt: null,
    source: "local",
  };
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function safeParseDraftCard(value: unknown): DraftCard | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const card = value as Record<string, unknown>;
  if (typeof card.cardId !== "string" || typeof card.name !== "string") {
    return null;
  }
  const quantityRaw = card.quantity;
  const quantity =
    typeof quantityRaw === "number" && Number.isInteger(quantityRaw) && quantityRaw > 0
      ? quantityRaw
      : 1;

  return {
    cardId: card.cardId,
    name: card.name,
    manaCost: normalizeOptionalString(card.manaCost),
    typeLine: normalizeOptionalString(card.typeLine),
    imageUrl: normalizeOptionalString(card.imageUrl),
    quantity,
  };
}

function safeParseDraft(raw: string | null): DraftDeck | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DraftDeck>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const id = typeof parsed.id === "string" ? parsed.id : generateId();
    const name = typeof parsed.name === "string" && parsed.name.trim().length ? parsed.name : DEFAULT_DECK_NAME;
    const format =
      typeof parsed.format === "string" && parsed.format.trim().length ? parsed.format : DEFAULT_FORMAT;
    const visibility: DeckVisibility = ["private", "unlisted", "public"].includes(
      parsed.visibility as DeckVisibility,
    )
      ? (parsed.visibility as DeckVisibility)
      : "private";

    const cards = Array.isArray(parsed.cards)
      ? (parsed.cards.map(safeParseDraftCard).filter(Boolean) as DraftCard[])
      : [];

    const lastUpdated =
      typeof parsed.lastUpdated === "string" && parsed.lastUpdated.trim().length
        ? parsed.lastUpdated
        : nowIso();

        const remoteId = typeof parsed.remoteId === "string" && parsed.remoteId.trim().length ? parsed.remoteId : null;
    const lastSyncedAt =
      typeof parsed.lastSyncedAt === "string" && parsed.lastSyncedAt.trim().length
        ? parsed.lastSyncedAt
        : null;
    const source: DraftDeck["source"] = parsed.source === "supabase" ? "supabase" : "local";

    return {
      id,
      remoteId,
      name,
      format,
      visibility,
      cards,
      lastUpdated,
      lastSyncedAt,
      source,
    };
  } catch {
    return null;
  }
}

function readDraftIndexRaw(): DraftIndexEntry[] {
  if (!isBrowser()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const data = entry as Partial<DraftIndexEntry> & Record<string, unknown>;
        if (typeof data.id !== "string") {
          return null;
        }
        return {
          id: data.id,
          name:
            typeof data.name === "string" && data.name.trim().length ? data.name : DEFAULT_DECK_NAME,
          format:
            typeof data.format === "string" && data.format.trim().length ? data.format : DEFAULT_FORMAT,
          lastUpdated:
            typeof data.lastUpdated === "string" && data.lastUpdated.trim().length
              ? data.lastUpdated
              : nowIso(),
          source: data.source === "supabase" ? "supabase" : "local",
        } satisfies DraftIndexEntry;
      })
      .filter(Boolean) as DraftIndexEntry[];
  } catch {
    return [];
  }
}

function writeDraftIndex(entries: DraftIndexEntry[]) {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch (error) {
    console.warn("Failed to write draft index", error);
  }
}

function loadDraftById(deckId: string): DraftDeck | null {
  if (!isBrowser() || !deckId) {
    return null;
  }
  const raw = window.localStorage.getItem(draftStorageKey(deckId));
  const deck = safeParseDraft(raw);
  if (!deck) {
    window.localStorage.removeItem(draftStorageKey(deckId));
  }
  return deck;
}

function removeDraftFromStorage(deckId: string) {
  if (!isBrowser() || !deckId) {
    return;
  }
  window.localStorage.removeItem(draftStorageKey(deckId));
  const entries = readDraftIndexRaw().filter((entry) => entry.id !== deckId);
  writeDraftIndex(entries);
  if (window.localStorage.getItem(LATEST_KEY) === deckId) {
    window.localStorage.removeItem(LATEST_KEY);
  }
}

function pruneDraftIndex(): DraftIndexEntry[] {
  if (!isBrowser()) {
    return [];
  }

  const nowMs = Date.now();
  const entries = readDraftIndexRaw();
  const kept: DraftIndexEntry[] = [];
  const latestId = window.localStorage.getItem(LATEST_KEY);

  entries.forEach((entry) => {
    const deck = loadDraftById(entry.id);
    if (!deck) {
      return;
    }
    const updatedAtMs = Date.parse(deck.lastUpdated ?? entry.lastUpdated);
    const isFresh = Number.isFinite(updatedAtMs) && nowMs - updatedAtMs <= LOCAL_DRAFT_TTL_MS;
    if (entry.source === "supabase" || isFresh) {
      kept.push({
        id: deck.id,
        name: deck.name,
        format: deck.format,
        lastUpdated: deck.lastUpdated,
        source: deck.source,
      });
    } else {
      window.localStorage.removeItem(draftStorageKey(entry.id));
      if (latestId === entry.id) {
        window.localStorage.removeItem(LATEST_KEY);
      }
    }
  });

  kept.sort((a, b) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated));
  writeDraftIndex(kept);

  const currentLatest = window.localStorage.getItem(LATEST_KEY);
  if (!kept.length) {
    window.localStorage.removeItem(LATEST_KEY);
  } else if (!currentLatest || !kept.some((entry) => entry.id === currentLatest)) {
    window.localStorage.setItem(LATEST_KEY, kept[0].id);
  }

  return kept.slice(0, HISTORY_LIMIT);
}

function migrateLegacyDeck(): DraftDeck | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  const deck = safeParseDraft(raw);
  if (!deck) {
    return null;
  }

  window.localStorage.setItem(draftStorageKey(deck.id), JSON.stringify(deck));
  window.localStorage.setItem(LATEST_KEY, deck.id);

  const index = readDraftIndexRaw().filter((entry) => entry.id !== deck.id);
  index.unshift({
    id: deck.id,
    name: deck.name,
    format: deck.format,
    lastUpdated: deck.lastUpdated,
    source: deck.source,
  });
  writeDraftIndex(index);
  return deck;
}

function readDeckFromStorage(): DraftDeck | null {
  if (!isBrowser()) {
    return null;
  }

  const latestId = window.localStorage.getItem(LATEST_KEY);
  if (latestId) {
    const latestDeck = loadDraftById(latestId);
    if (latestDeck) {
      return latestDeck;
    }
  }

  const entries = pruneDraftIndex();
  for (const entry of entries) {
    const deck = loadDraftById(entry.id);
    if (deck) {
      window.localStorage.setItem(LATEST_KEY, deck.id);
      return deck;
    }
  }

  return migrateLegacyDeck();
}

function writeDeckToStorage(deck: DraftDeck) {
  if (!isBrowser()) {
    return;
  }

  try {
    const persisted: DraftDeck = {
      ...deck,
      remoteId: deck.remoteId ?? null,
      name: deck.name.trim().length ? deck.name : DEFAULT_DECK_NAME,
      format: deck.format.trim().length ? deck.format : DEFAULT_FORMAT,
      lastUpdated: deck.lastUpdated ?? nowIso(),
      lastSyncedAt: deck.lastSyncedAt ?? null,
      source: deck.source === "supabase" ? "supabase" : "local",
    };

    window.localStorage.setItem(draftStorageKey(deck.id), JSON.stringify(persisted));
    window.localStorage.setItem(LATEST_KEY, deck.id);

    const index = readDraftIndexRaw().filter((entry) => entry.id !== deck.id);
    index.unshift({
      id: deck.id,
      name: persisted.name,
      format: persisted.format,
      lastUpdated: persisted.lastUpdated,
      source: persisted.source,
    });
    writeDraftIndex(index);
  } catch (error) {
    console.warn("Failed to write draft deck to storage", error);
  }
}

type AddCardInput = {
  cardId: string;
  name: string;
  manaCost?: string | null;
  typeLine?: string | null;
  imageUrl?: string | null;
};

type ImportResult = { ok: true; added: number } | { ok: false; error: string };

export function useDraftDeck() {
  const initialDeckFromStorageRef = useRef<DraftDeck | null>(null);
  const [deck, setDeck] = useState<DraftDeck>(() => {
    const stored = readDeckFromStorage();
    initialDeckFromStorageRef.current = stored;
    return stored ?? createInitialDeck();
  });

  const creationTelemetrySent = useRef(Boolean(initialDeckFromStorageRef.current));
  const [recentDrafts, setRecentDrafts] = useState<DraftIndexEntry[]>(() =>
    isBrowser() ? pruneDraftIndex() : [],
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!deck) {
      return;
    }
    writeDeckToStorage(deck);
    if (isBrowser()) {
      setRecentDrafts(pruneDraftIndex());
    }
  }, [deck]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }
    setRecentDrafts(pruneDraftIndex());
  }, []);

  useEffect(() => {
    if (!deck || creationTelemetrySent.current) {
      return;
    }

    trackDeckCreated({
      deckId: deck.id,
      format: deck.format,
      visibility: deck.visibility,
      seed: "blank",
      source: deck.source === "supabase" ? "builder" : "builder",
      cardCount: deck.cards.reduce((total, card) => total + card.quantity, 0),
    });
    creationTelemetrySent.current = true;
  }, [deck]);

  const updateDeck = useCallback((updater: (current: DraftDeck) => DraftDeck) => {
    setDeck((current) => {
      const next = updater(current);
      return { ...next, lastUpdated: nowIso() };
    });
  }, []);

  const updateDeckMeta = useCallback(
    (updates: Partial<Pick<DraftDeck, "name" | "format" | "visibility">>) => {
      updateDeck((current) => ({
        ...current,
        ...updates,
      }));
    },
    [updateDeck],
  );

  const syncToSupabase = useCallback(async () => {
    if (!SUPABASE_ENABLED) {
      const message = "Supabase environment is not configured.";
      setSyncError(message);
      return { ok: false as const, error: message };
    }

    if (!deck) {
      const message = "No draft available to sync.";
      setSyncError(message);
      return { ok: false as const, error: message };
    }

    setIsSyncing(true);
    setSyncError(null);

    const metadata = {
      name: deck.name.trim().length ? deck.name : DEFAULT_DECK_NAME,
      format: deck.format.trim().length ? deck.format : DEFAULT_FORMAT,
      visibility: deck.visibility,
    };

    try {
      let remoteId = deck.remoteId ?? null;

      if (!remoteId) {
        const createResponse = await fetch("/api/decks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: metadata.name,
            format: metadata.format,
            visibility: metadata.visibility,
          }),
        });

        const createPayload = (await createResponse.json().catch(() => ({}))) as {
          data?: { id?: string; visibility?: DeckVisibility; format?: string; name?: string };
          error?: string;
        };

        if (!createResponse.ok || !createPayload?.data?.id) {
          throw new Error(createPayload?.error ?? "Failed to create deck.");
        }

        remoteId = createPayload.data.id;
        const remoteVisibility =
          (createPayload.data.visibility as DeckVisibility | undefined) ?? metadata.visibility;

        updateDeck((current) => ({
          ...current,
          remoteId,
          visibility: remoteVisibility,
          source: "supabase",
        }));
      }

      if (!remoteId) {
        throw new Error("Remote deck id missing after creation.");
      }

      const endpoint = "/api/decks/cards?deckId=" + encodeURIComponent(remoteId);
      const updateResponse = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          cards: deck.cards.map((card) => ({
            printingId: card.cardId,
            quantity: card.quantity,
            zone: "mainboard",
          })),
          metadata: {
            name: metadata.name,
            format: metadata.format,
            visibility: metadata.visibility,
          },
        }),
      });

      const updatePayload = (await updateResponse.json().catch(() => ({}))) as {
        data?: { name?: string; format?: string; visibility?: DeckVisibility | string };
        meta?: { cardEntryCount?: number; cardQuantity?: number } | undefined;
        error?: string;
      };

      if (!updateResponse.ok) {
        throw new Error(updatePayload?.error ?? "Failed to sync deck cards.");
      }

      const cardEntryCount = Number.isFinite(updatePayload.meta?.cardEntryCount)
        ? Number(updatePayload.meta?.cardEntryCount)
        : deck.cards.length;
      const cardQuantity = Number.isFinite(updatePayload.meta?.cardQuantity)
        ? Number(updatePayload.meta?.cardQuantity)
        : deck.cards.reduce((total, card) => total + card.quantity, 0);

      const now = nowIso();
      updateDeck((current) => ({
        ...current,
        remoteId,
        source: "supabase",
        name: metadata.name,
        format: metadata.format,
        visibility: (updatePayload.data?.visibility as DeckVisibility | undefined) ?? metadata.visibility,
        lastSyncedAt: now,
      }));

      setSyncError(null);
      return { ok: true as const, remoteId, cardEntryCount, cardQuantity };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync deck.";
      setSyncError(message);
      return { ok: false as const, error: message };
    } finally {
      setIsSyncing(false);
    }
  }, [deck, updateDeck]);

  const addCard = useCallback(
    (card: AddCardInput) => {
      if (!card.cardId || !card.name) {
        return;
      }

      updateDeck((current) => {
        const existing = current.cards.find((entry) => entry.cardId === card.cardId);
        trackDeckCardAdded({ deckId: current.id, cardId: card.cardId, zone: "mainboard", method: "manual" });

        if (existing) {
          return {
            ...current,
            cards: current.cards.map((entry) =>
              entry.cardId === card.cardId ? { ...entry, quantity: entry.quantity + 1 } : entry,
            ),
          };
        }

        const nextCard: DraftCard = {
          cardId: card.cardId,
          name: card.name,
          manaCost: card.manaCost ?? undefined,
          typeLine: card.typeLine ?? undefined,
          imageUrl: card.imageUrl ?? undefined,
          quantity: 1,
        };

        return {
          ...current,
          cards: [...current.cards, nextCard],
        };
      });
    },
    [updateDeck],
  );

  const decrementCard = useCallback(
    (cardId: string) => {
      updateDeck((current) => {
        const existing = current.cards.find((entry) => entry.cardId === cardId);
        if (!existing) {
          return current;
        }
        if (existing.quantity <= 1) {
          return {
            ...current,
            cards: current.cards.filter((entry) => entry.cardId !== cardId),
          };
        }
        return {
          ...current,
          cards: current.cards.map((entry) =>
            entry.cardId === cardId ? { ...entry, quantity: entry.quantity - 1 } : entry,
          ),
        };
      });
    },
    [updateDeck],
  );

  const removeCard = useCallback(
    (cardId: string) => {
      updateDeck((current) => ({
        ...current,
        cards: current.cards.filter((entry) => entry.cardId !== cardId),
      }));
    },
    [updateDeck],
  );

  const resetDeck = useCallback(() => {
    creationTelemetrySent.current = false;
    setDeck(createInitialDeck());
  }, []);

  const loadDraft = useCallback(
    (draftId: string) => {
      if (!draftId) {
        return false;
      }
      const stored = loadDraftById(draftId);
      if (!stored) {
        return false;
      }
      creationTelemetrySent.current = true;
      setDeck({ ...stored, lastUpdated: nowIso() });
      return true;
    },
    [],
  );

  const deleteDraft = useCallback(
    (draftId: string) => {
      if (!draftId) {
        return;
      }
      removeDraftFromStorage(draftId);
      setRecentDrafts(pruneDraftIndex());
      if (deck.id === draftId) {
        creationTelemetrySent.current = false;
        setDeck(createInitialDeck());
      }
    },
    [deck.id],
  );

  const importFromList = useCallback(
    (list: string, source = "manual_list"): ImportResult => {
      if (!deck || !list.trim()) {
        return { ok: false, error: "Nothing to import." };
      }

      const importId = generateId("import");
      trackImportAttempted({ importId, source, status: "pending" });

      try {
        const lines = list
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        if (!lines.length) {
          trackImportAttempted({ importId, source, status: "failed", errorCode: "empty" });
          return { ok: false, error: "No card names detected." };
        }

        updateDeck((current) => {
          const nextCards = [...current.cards];
          lines.forEach((line) => {
            const quantityMatch = line.match(/^([0-9]+)[x\s]+(.+)/i);
            const quantity = quantityMatch ? Number.parseInt(quantityMatch[1], 10) : 1;
            const name = quantityMatch ? quantityMatch[2] : line;
            const cardId = generateId("import-card");

            const normalizedQuantity = Number.isFinite(quantity) ? quantity : 1;
            const existing = nextCards.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
            trackDeckCardAdded({ deckId: current.id, cardId, zone: "mainboard", method: "import" });

            if (existing) {
              existing.quantity += normalizedQuantity;
            } else {
              nextCards.push({ cardId, name, quantity: normalizedQuantity });
            }
          });
          return {
            ...current,
            cards: nextCards,
          };
        });

        trackImportAttempted({
          importId,
          source,
          status: "success",
          cardCount: lines.length,
        });

        return { ok: true, added: lines.length };
      } catch (error) {
        console.warn("Failed to import deck list", error);
        trackImportAttempted({ importId, source, status: "failed", errorCode: "parse_error" });
        return { ok: false, error: "Failed to parse deck list." };
      }
    },
    [deck, updateDeck],
  );

  const exportToJson = useCallback((): string | null => {
    if (!deck) {
      return null;
    }
    const payload = {
      id: deck.id,
      name: deck.name,
      format: deck.format,
      visibility: deck.visibility,
      cards: deck.cards,
      exportedAt: nowIso(),
    };
    trackExportCompleted({
      deckId: deck.id,
      exportFormat: "json",
      cardsMissing: 0,
      destination: "local_download",
    });
    return JSON.stringify(payload, null, 2);
  }, [deck]);

  const cardCount = useMemo(
    () => deck.cards.reduce((total, card) => total + card.quantity, 0),
    [deck.cards],
  );

  return {
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
    exportToJson,
    syncToSupabase,
    isSupabaseConfigured: SUPABASE_ENABLED,
    isSyncing,
    syncError,
  };
}

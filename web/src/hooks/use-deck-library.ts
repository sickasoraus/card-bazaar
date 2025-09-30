"use client";

import { useCallback, useEffect, useState } from "react";

export type DeckLibraryEntry = {
  id: string;
  name: string;
  format: string;
  lastUpdated: string;
  source: "local" | "supabase" | string;
};

const INDEX_STORAGE_KEY = "metablazt:draft:index";
const ACTIVE_STORAGE_KEY = "metablazt:draft:latest";

function parseDeckIndex(raw: string | null): DeckLibraryEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => ({
        id: typeof entry?.id === "string" ? entry.id : "",
        name: typeof entry?.name === "string" ? entry.name : "Untitled deck",
        format: typeof entry?.format === "string" ? entry.format : "commander",
        lastUpdated: typeof entry?.lastUpdated === "string" ? entry.lastUpdated : new Date().toISOString(),
        source: typeof entry?.source === "string" ? entry.source : "local",
      }))
      .filter((entry) => entry.id.length > 0);
  } catch {
    return [];
  }
}

export function useDeckLibrary() {
  const [decks, setDecks] = useState<DeckLibraryEntry[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const parsed = parseDeckIndex(window.localStorage.getItem(INDEX_STORAGE_KEY));
    setDecks(parsed);

    const storedActive = window.localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (storedActive && parsed.some((entry) => entry.id === storedActive)) {
      setActiveDeckId(storedActive);
    } else if (parsed.length) {
      setActiveDeckId(parsed[0].id);
    } else {
      setActiveDeckId(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setIsHydrated(true);
    refresh();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === INDEX_STORAGE_KEY || event.key === ACTIVE_STORAGE_KEY || event.key === null) {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refresh]);

  return {
    decks,
    activeDeckId,
    refresh,
    isHydrated,
  };
}
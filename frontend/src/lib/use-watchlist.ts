"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "norsk-nettverk:watchlist:v1";

export interface WatchlistEntry {
  personId: string;
  name: string;
  addedAt: string;
}

function readStorage(): WatchlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is WatchlistEntry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as WatchlistEntry).personId === "string" &&
        typeof (e as WatchlistEntry).name === "string",
    );
  } catch {
    return [];
  }
}

function writeStorage(entries: WatchlistEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(readStorage());
    setHydrated(true);
  }, []);

  // Cross-tab sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEntries(readStorage());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isWatched = useCallback(
    (personId: string) => entries.some((e) => e.personId === personId),
    [entries],
  );

  const add = useCallback((personId: string, name: string) => {
    setEntries((prev) => {
      if (prev.some((e) => e.personId === personId)) return prev;
      const next = [
        ...prev,
        { personId, name, addedAt: new Date().toISOString() },
      ];
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((personId: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.personId !== personId);
      writeStorage(next);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (personId: string, name: string) => {
      if (isWatched(personId)) remove(personId);
      else add(personId, name);
    },
    [isWatched, add, remove],
  );

  return { entries, hydrated, isWatched, add, remove, toggle };
}

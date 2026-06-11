"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Photo map — { personId -> thumbnail URL }.
 * Populated once at app-shell render time from /api/graph/overview and
 * shared with every screen so components only need a personId to look
 * up the right avatar.
 */
const PhotoMapContext = createContext<Map<string, string>>(new Map());

export function PhotoMapProvider({
  photos,
  children,
}: {
  photos: Record<string, string>;
  children: ReactNode;
}) {
  const map = useMemo(() => new Map(Object.entries(photos)), [photos]);
  return (
    <PhotoMapContext.Provider value={map}>{children}</PhotoMapContext.Provider>
  );
}

/** Returns the full map. Components doing many lookups should grab this once. */
export function usePhotoMap(): Map<string, string> {
  return useContext(PhotoMapContext);
}

/** Convenience hook for a single person id lookup. */
export function usePhotoUrl(personId: string | undefined | null): string | undefined {
  const map = useContext(PhotoMapContext);
  if (!personId) return undefined;
  return map.get(personId);
}

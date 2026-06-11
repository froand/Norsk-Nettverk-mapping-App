"use client";

import { useState } from "react";
import { usePhotoUrl } from "./PhotoMapProvider";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "size-8 text-[10px]",
  sm: "size-10 text-xs",
  md: "size-12 text-sm",
  lg: "size-16 text-base",
  xl: "size-20 text-xl",
};

/**
 * Round avatar with image-first / initials-fallback behaviour.
 *
 * - `imageUrl` wins if supplied (e.g. from PersonDetails.imageUrl)
 * - else looks up `personId` against the photo map context
 * - else renders coloured initials
 *
 * Renders a plain `<img>` (not next/image) so we don't have to whitelist
 * Wikimedia / Stortinget hosts in next.config — these images are already
 * lightweight thumbs (~30 KB) and we lazy-load all but the first paint.
 */
export function Avatar({
  name,
  personId,
  imageUrl,
  size = "md",
  rounded = "full",
  className = "",
  priority = false,
}: {
  name: string;
  personId?: string;
  imageUrl?: string | null;
  size?: AvatarSize;
  rounded?: "full" | "2xl";
  className?: string;
  /** Disable lazy loading for the first paint (e.g. profile hero) */
  priority?: boolean;
}) {
  const lookedUp = usePhotoUrl(personId);
  const src = imageUrl ?? lookedUp;
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const shape = rounded === "2xl" ? "rounded-2xl" : "rounded-full";

  const base = `${SIZE_CLASSES[size]} ${shape} shrink-0 overflow-hidden ${className}`;

  if (showImage) {
    return (
      <img
        src={src}
        alt={name}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        className={`${base} object-cover bg-[var(--color-secondary-container)] border border-[var(--color-border)]`}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      aria-label={name}
      title={name}
      className={`${base} grid place-items-center font-bold text-[var(--color-fg-muted)] bg-[var(--color-secondary-container)] border border-[var(--color-border)] uppercase`}
    >
      {initials(name)}
    </div>
  );
}

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !/^(jr|sr|dr|prof)\.?$/i.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}

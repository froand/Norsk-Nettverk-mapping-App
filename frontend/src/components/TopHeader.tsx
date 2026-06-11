import Link from "next/link";
import { Search, User } from "lucide-react";
import { strings } from "@/lib/strings/nb";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
      <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
        <div className="size-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-on-primary)] font-bold shrink-0">
          N
        </div>
        <span className="font-semibold tracking-wide text-sm truncate">
          {strings.brand}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/katalog"
          aria-label="Søk"
          className="size-9 rounded-full bg-[var(--color-surface-high)] flex items-center justify-center"
        >
          <Search className="size-4" />
        </Link>
        <button
          aria-label="Profil"
          className="size-9 rounded-full bg-[var(--color-surface-high)] flex items-center justify-center"
        >
          <User className="size-4" />
        </button>
      </div>
    </header>
  );
}

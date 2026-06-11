import { Search } from "lucide-react";
import { strings } from "@/lib/strings/nb";

export default function DirectoryPage() {
  return (
    <div>
      <section className="px-4 pt-4">
        <h1 className="text-xl font-bold">{strings.directory.title}</h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          {strings.directory.subtitle}
        </p>
      </section>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-low)] border border-[var(--color-border)] px-3 py-2.5">
          <Search className="size-4 text-[var(--color-fg-dim)]" />
          <input
            type="search"
            placeholder={strings.search.placeholder}
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--color-fg-dim)] outline-none"
          />
        </div>
      </div>

      <div className="px-4 pt-4 flex gap-2 overflow-x-auto scrollbar-hide">
        <span className="chip chip-active">Alle</span>
        <span className="chip">Lobbyister</span>
        <span className="chip">MPs</span>
        <span className="chip">Energi</span>
      </div>

      <div className="px-4 pt-4 flex items-center justify-between text-xs text-[var(--color-fg-muted)]">
        <span>Sortér: {strings.directory.sortByName}</span>
      </div>

      <ul className="px-4 pt-3 space-y-2 pb-6">
        <DirectoryRow
          name="Anders Bjørnstad"
          subtitle="Eks-statsråd for infrastruktur"
          tag="14 forbindelser"
          badge={strings.directory.badgeRevolvingRisk}
          tone="warning"
        />
        <DirectoryRow
          name="Elinor Vance"
          subtitle="Senior-partner, Apex Industries"
          tag="29 aktive"
          badge={strings.directory.badgeClean}
          tone="success"
        />
        <DirectoryRow
          name="Marcus Thon"
          subtitle="MP — Bodø Nord"
          tag="Energi & klima"
          badge={strings.directory.badgeDisclosure}
          tone="danger"
        />
      </ul>
    </div>
  );
}

function DirectoryRow({
  name,
  subtitle,
  tag,
  badge,
  tone,
}: {
  name: string;
  subtitle: string;
  tag: string;
  badge: string;
  tone: "warning" | "danger" | "success";
}) {
  const badgeClass =
    tone === "warning"
      ? "badge-warning"
      : tone === "danger"
        ? "badge-danger"
        : "badge-success";
  return (
    <li className="card-surface p-3 flex items-start gap-3">
      <div className="size-12 rounded-full bg-[var(--color-secondary-container)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm truncate">{name}</p>
          <span
            className={`chip text-[10px] uppercase tracking-wider whitespace-nowrap ${badgeClass}`}
          >
            {badge}
          </span>
        </div>
        <p className="text-xs text-[var(--color-fg-muted)] truncate">
          {subtitle}
        </p>
        <p className="text-[11px] text-[var(--color-fg-dim)] mt-1">{tag}</p>
      </div>
    </li>
  );
}

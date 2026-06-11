import { Bell, Plus } from "lucide-react";
import { strings } from "@/lib/strings/nb";

export default function AlertsPage() {
  return (
    <div>
      <section className="px-4 pt-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="size-5 text-[var(--color-primary)]" />
          {strings.alerts.title}
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          {strings.alerts.subtitle}
        </p>
      </section>

      <ul className="px-4 pt-4 space-y-2 pb-6">
        <AlertRow
          title="Anders S. Dahl"
          subtitle="Olje- og energidepartementet → Equinor styre"
          ago="14 min siden"
          badge={strings.dashboard.badgeRevolvingDoor}
          tone="warning"
        />
        <AlertRow
          title="Ingrid Foss"
          subtitle="Storting → First House Consulting"
          ago="2 timer siden"
          badge="LOBBY-REGISTRERING"
          tone="danger"
        />
        <AlertRow
          title="Erik Magnussen"
          subtitle="Helse- og omsorgsdept. → Telenor Health"
          ago="1 dag siden"
          badge="UNDERSØKES"
          tone="primary"
        />
      </ul>

      <section className="px-4 pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          Overvåking
        </h2>
        <div className="card-surface p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[var(--color-fg-muted)]">
            {strings.alerts.watchlistEmpty}
          </p>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs font-semibold">
            <Plus className="size-3" />
            {strings.alerts.addToWatchlist}
          </button>
        </div>
      </section>
    </div>
  );
}

function AlertRow({
  title,
  subtitle,
  ago,
  badge,
  tone,
}: {
  title: string;
  subtitle: string;
  ago: string;
  badge: string;
  tone: "warning" | "danger" | "primary";
}) {
  const badgeClass =
    tone === "warning"
      ? "badge-warning"
      : tone === "danger"
        ? "badge-danger"
        : "chip-active";
  return (
    <li className="card-surface p-3 flex items-start gap-3">
      <div className="size-10 rounded-full bg-[var(--color-secondary-container)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm truncate">{title}</p>
          <span
            className={`chip text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0 ${badgeClass}`}
          >
            {badge}
          </span>
        </div>
        <p className="text-xs text-[var(--color-fg-muted)] truncate">
          {subtitle}
        </p>
        <p className="text-[11px] text-[var(--color-fg-dim)] mt-1">{ago}</p>
      </div>
    </li>
  );
}

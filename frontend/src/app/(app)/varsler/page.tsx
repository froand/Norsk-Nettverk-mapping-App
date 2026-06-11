import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  FileText,
  RefreshCcw,
  Scale,
} from "lucide-react";
import { strings } from "@/lib/strings/nb";
import { loadAlerts, type AlertItem, type AlertKind } from "@/lib/alerts-data";
import { WatchlistSection } from "./watchlist-section";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const { items, partial } = await loadAlerts();

  return (
    <>
      <section className="px-4 pt-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="size-5 text-[var(--color-primary)]" />
          {strings.alerts.title}
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          {strings.alerts.subtitle}
        </p>
      </section>

      {partial ? (
        <div className="px-4 pt-3">
          <div className="rounded-xl border border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/10 px-3 py-2 flex items-center gap-2 text-xs text-[var(--color-tertiary)]">
            <AlertTriangle className="size-3.5 shrink-0" />
            {strings.dashboard.partialDataWarning}
          </div>
        </div>
      ) : null}

      <div className="pt-4">
        <WatchlistSection alerts={items} />
      </div>

      <section className="px-4 pt-6 pb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.alerts.feedTitle} · {items.length}
        </h2>
        {items.length === 0 ? (
          <div className="card-surface p-4 text-center text-xs text-[var(--color-fg-dim)]">
            {strings.alerts.feedEmpty}
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <AlertRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function AlertRow({ item }: { item: AlertItem }) {
  const Icon = kindIcon(item.kind);
  const badge = kindBadge(item.kind);
  const badgeClass = kindBadgeClass(item.kind);
  const linkable = !!item.personId;
  // Avoid nested-anchor HTML: outer wrapper is a div, only the title links.
  return (
    <li className="card-surface p-3 flex items-start gap-3">
      <div
        className={`size-10 rounded-full grid place-items-center shrink-0 ${kindIconBg(item.kind)}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {linkable ? (
            <Link
              href={`/profile/${encodeURIComponent(item.personId!)}`}
              className="font-semibold text-sm truncate text-[var(--color-fg)] hover:text-[var(--color-primary)] transition-colors"
            >
              {item.title}
            </Link>
          ) : (
            <p className="font-semibold text-sm truncate">{item.title}</p>
          )}
          <span
            className={`chip text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0 ${badgeClass}`}
          >
            {badge}
          </span>
        </div>
        {item.subtitle ? (
          <p className="text-xs text-[var(--color-fg-muted)] truncate">
            {item.subtitle}
          </p>
        ) : null}
        <div className="text-[11px] text-[var(--color-fg-dim)] mt-1 flex items-center gap-3">
          <span>{item.dateLabel}</span>
          {item.pdfUrl ? (
            <a
              href={item.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
            >
              <FileText className="size-3" />
              {strings.alerts.openPdf}
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function kindIcon(k: AlertKind) {
  if (k === "karantene") return Scale;
  if (k === "revolving_door") return RefreshCcw;
  return AlertTriangle;
}

function kindIconBg(k: AlertKind): string {
  if (k === "karantene") return "bg-[var(--color-primary)]/15 text-[var(--color-primary)]";
  if (k === "revolving_door") return "bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)]";
  return "bg-[var(--color-conflict-high)]/15 text-[var(--color-conflict-high)]";
}

function kindBadge(k: AlertKind): string {
  if (k === "karantene") return strings.alerts.badgeKarantene;
  if (k === "revolving_door") return strings.alerts.badgeRevolving;
  return strings.alerts.badgeConflict;
}

function kindBadgeClass(k: AlertKind): string {
  if (k === "karantene") return "chip-active";
  if (k === "revolving_door") return "badge-warning";
  return "badge-danger";
}

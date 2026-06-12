import Link from "next/link";
import { Activity, Clock, ExternalLink, Scale } from "lucide-react";
import { strings } from "@/lib/strings/nb";
import {
  type ChangeEntry,
  type ChangeSource,
  type ChangesData,
  formatRelative,
  formatTimeOfDay,
  groupByDay,
} from "@/lib/changes-data";

interface Props {
  data: ChangesData;
}

export function ChangesSection({ data }: Props) {
  const { recent, lastRefresh } = data;
  const lastUpdated = recent.updatedAt ?? lastRefresh.ts ?? null;
  const groups = groupByDay(recent.entries);

  return (
    <section className="px-4 pt-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-2 flex items-center gap-2">
        <Activity className="size-4 text-[var(--color-primary)]" />
        {strings.changes.sectionTitle}
        <span className="text-[var(--color-fg-dim)] font-normal normal-case tracking-normal">
          · {recent.total}
        </span>
      </h2>

      <div className="text-[11px] text-[var(--color-fg-dim)] flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {strings.changes.lastUpdatedLabel}:{" "}
          <span className="text-[var(--color-fg-muted)]">
            {lastUpdated ? formatRelative(lastUpdated) : "—"}
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {strings.changes.nextUpdateLabel}:{" "}
          <span className="text-[var(--color-fg-muted)]">
            {formatRelative(lastRefresh.nextScheduled)}
          </span>
        </span>
      </div>

      {!recent.available ? (
        <div className="card-surface p-4 text-center text-xs text-[var(--color-fg-dim)]">
          {strings.changes.notRunYet}
        </div>
      ) : groups.length === 0 ? (
        <div className="card-surface p-4 text-center text-xs text-[var(--color-fg-dim)]">
          {strings.changes.empty}{" "}
          {lastUpdated ? (
            <span className="block mt-1">
              {strings.changes.emptyLastChecked}: {formatRelative(lastUpdated)}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-2">
                {bucketLabel(group.label, group.bucket)}
              </h3>
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <ChangeRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function bucketLabel(
  label: string,
  bucket: "today" | "yesterday" | "other",
): string {
  if (bucket === "today") return strings.changes.groupToday;
  if (bucket === "yesterday") return strings.changes.groupYesterday;
  return label;
}

function ChangeRow({ entry }: { entry: ChangeEntry }) {
  const badgeText =
    entry.source === "karantene"
      ? strings.changes.sourceKarantene
      : strings.changes.sourceBrreg;
  const badgeClass =
    entry.source === "karantene" ? "badge-warning" : "chip-active";
  const Icon = entry.source === "karantene" ? Scale : Activity;
  const iconBg =
    entry.source === "karantene"
      ? "bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)]"
      : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]";

  const pdfUrl = readPdfUrl(entry);
  const linkable = !!entry.personId;

  return (
    <li className="card-surface p-3 flex items-start gap-3">
      <div className={`size-9 rounded-full grid place-items-center shrink-0 ${iconBg}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-[var(--color-fg)] leading-snug">
            {linkable ? (
              <Link
                href={`/profile/${encodeURIComponent(entry.personId!)}`}
                className="font-semibold hover:text-[var(--color-primary)] transition-colors"
              >
                {entry.summary}
              </Link>
            ) : (
              <span className="font-semibold">{entry.summary}</span>
            )}
          </p>
          <span
            className={`chip text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0 ${badgeClass}`}
          >
            {badgeText}
          </span>
        </div>
        <div className="text-[11px] text-[var(--color-fg-dim)] mt-1 flex items-center gap-3">
          <span>{typeLabel(entry.source, entry.type)}</span>
          <span>{formatTimeOfDay(entry.ts)}</span>
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
            >
              <ExternalLink className="size-3" />
              PDF
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function typeLabel(_source: ChangeSource, type: ChangeEntry["type"]): string {
  if (type === "POSITION_ADDED") return strings.changes.typePositionAdded;
  if (type === "POSITION_REMOVED") return strings.changes.typePositionRemoved;
  if (type === "KARANTENE_NEW") return strings.changes.typeKaranteneNew;
  return type;
}

function readPdfUrl(entry: ChangeEntry): string | null {
  const raw = entry.details?.pdfUrl;
  return typeof raw === "string" ? raw : null;
}

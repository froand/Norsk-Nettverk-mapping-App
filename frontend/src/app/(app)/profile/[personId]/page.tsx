import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Network as Hub,
  Landmark,
  ScrollText,
  Users,
} from "lucide-react";
import { strings } from "@/lib/strings/nb";
import { loadProfile } from "@/lib/profile-data";
import { Avatar } from "@/components/Avatar";
import { WatchToggleButton } from "../../varsler/watchlist-section";
import type {
  ConflictOfInterest,
  ConflictSeverity,
  KaranteneDecision,
  TimelinePosition,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const profile = await loadProfile(personId);

  if (!profile.details) {
    notFound();
  }

  const { details, timeline, conflicts, karantene, metrics, partial } = profile;
  const currentTopRole = details.currentPositions[0];
  const sortedTimeline = timeline
    ? [...timeline.positions].sort((a, b) => a.startYear - b.startYear)
    : [];

  return (
    <>
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[var(--color-primary)] text-sm font-semibold hover:opacity-80"
        >
          <ArrowLeft className="size-4" />
          {strings.profile.backToDashboard}
        </Link>
      </div>

      {partial ? (
        <div className="px-4 pt-2">
          <div className="rounded-xl border border-[var(--color-tertiary)]/40 bg-[var(--color-tertiary)]/10 px-3 py-2 flex items-center gap-2 text-xs text-[var(--color-tertiary)]">
            <AlertTriangle className="size-3.5 shrink-0" />
            {strings.dashboard.partialDataWarning}
          </div>
        </div>
      ) : null}

      <section className="px-4 pt-4">
        <div className="flex items-start gap-4">
          <Avatar
            name={details.name}
            personId={details.id}
            imageUrl={details.imageUrl}
            size="xl"
            rounded="2xl"
            priority
          />
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight">{details.name}</h1>
            {currentTopRole ? (
              <p className="text-sm text-[var(--color-fg-muted)] mt-1 line-clamp-2">
                {currentTopRole.title}, {currentTopRole.organization}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {details.party ? (
                <span className="chip text-[10px] uppercase tracking-wider">
                  {strings.profile.party}: {details.party}
                </span>
              ) : null}
              {details.fylke ? (
                <span className="chip text-[10px] uppercase tracking-wider">
                  {strings.profile.fylke}: {details.fylke}
                </span>
              ) : null}
              <WatchToggleButton personId={details.id} name={details.name} />
            </div>
          </div>
        </div>

        <ConflictScoreGauge
          score={metrics.conflictScore}
          risk={metrics.riskLevel}
          message={metrics.primaryRiskMessage}
          gapDays={metrics.revolvingDoorGapDays}
        />
      </section>

      <section className="px-4 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <Metric
            icon={<Hub className="size-4" />}
            label={strings.profile.connections}
            value={metrics.connections}
          />
          <Metric
            icon={<Calendar className="size-4" />}
            label={strings.profile.tenure}
            value={`${metrics.tenureYears} år`}
          />
          <Metric
            icon={<Building2 className="size-4" />}
            label={strings.profile.boards}
            value={metrics.boardSeats}
          />
          <Metric
            icon={<Users className="size-4" />}
            label={strings.profile.pastRoles}
            value={metrics.pastRoleCount}
          />
        </div>
      </section>

      <section className="px-4 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3 flex items-center gap-2">
          <ScrollText className="size-4 text-[var(--color-primary)]" />
          {strings.profile.careerTrajectory}
        </h2>
        {sortedTimeline.length === 0 ? (
          <EmptyState message="Ingen tidslinjedata." />
        ) : (
          <CareerTimeline positions={sortedTimeline} />
        )}
      </section>

      <section className="px-4 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-[var(--color-conflict-high)]" />
          {strings.profile.conflictsOfInterest}
        </h2>
        {conflicts.length === 0 ? (
          <EmptyState message={strings.profile.noConflicts} />
        ) : (
          <div className="space-y-2">
            {conflicts.map((c, i) => (
              <ConflictRow key={i} c={c} />
            ))}
          </div>
        )}
      </section>

      <section className="px-4 pt-6 pb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-1 flex items-center gap-2">
          <FileText className="size-4 text-[var(--color-primary)]" />
          {strings.profile.karantene}
        </h2>
        <p className="text-xs text-[var(--color-fg-dim)] mb-3">
          {strings.profile.karanteneSubtitle}
        </p>
        {karantene.length === 0 ? (
          <EmptyState message={strings.profile.noKarantene} />
        ) : (
          <div className="space-y-2">
            {karantene.map((k) => (
              <KaranteneRow key={k.id} k={k} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ConflictScoreGauge({
  score,
  risk,
  message,
  gapDays,
}: {
  score: number;
  risk: ConflictSeverity;
  message: string | null;
  gapDays: number | null;
}) {
  const barColor = riskFillColor(risk);
  const textColor = riskTextColor(risk);
  return (
    <div className="mt-4 card-surface p-4">
      <div className="flex justify-between items-end mb-2">
        <span className="text-[11px] uppercase tracking-wider text-[var(--color-fg-muted)] font-semibold">
          {strings.profile.conflictScoreIndex}
        </span>
        <span className={`text-xl font-bold ${textColor}`}>
          {score}/100
        </span>
      </div>
      <div className="h-1.5 w-full bg-[var(--color-surface-high)] rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
      {message ? (
        <p className={`mt-2 text-[10px] uppercase ${textColor} flex items-center gap-1`}>
          <AlertTriangle className="size-3" />
          {message}
        </p>
      ) : null}
      {gapDays != null ? (
        <p className="mt-1 text-[10px] uppercase text-[var(--color-fg-dim)]">
          {strings.profile.revolvingDoorGap}: {gapDays} {strings.profile.days}
        </p>
      ) : null}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="card-surface p-3">
      <div className="flex items-center gap-1.5 text-[var(--color-fg-muted)] mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[var(--color-fg)] leading-none">
        {value}
      </div>
    </div>
  );
}

function CareerTimeline({ positions }: { positions: TimelinePosition[] }) {
  return (
    <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
      <div className="inline-flex items-start gap-4 pt-6 pb-2 min-w-full">
        {positions.map((p, i) => {
          const isPublic = p.category === "political" || p.category === "government";
          const accent = isPublic
            ? "text-[var(--color-primary)]"
            : "text-[var(--color-tertiary)]";
          const dot = isPublic
            ? "border-[var(--color-primary)]"
            : "border-[var(--color-tertiary)]";
          const line = isPublic
            ? "bg-[var(--color-primary)]"
            : "bg-[var(--color-tertiary)]";
          const Icon = categoryIcon(p.category);
          return (
            <div key={i} className="w-56 shrink-0 relative">
              <div className={`text-[10px] uppercase ${accent} mb-1 font-semibold tracking-wider`}>
                {p.startYear}—{p.endYear ?? strings.profile.present}
              </div>
              <div className="relative mb-3">
                <div className={`h-0.5 w-full ${line}`} />
                <div
                  className={`absolute -top-1 left-0 size-2.5 rounded-full border-2 ${dot} bg-[var(--color-bg)]`}
                />
              </div>
              <div className="card-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold line-clamp-2">{p.role}</h4>
                  <Icon className={`size-4 shrink-0 ${accent}`} />
                </div>
                <p className="text-xs text-[var(--color-fg-muted)] mt-1 line-clamp-2">
                  {p.orgName}
                </p>
                {p.sector ? (
                  <p className="text-[10px] text-[var(--color-fg-dim)] mt-1 capitalize">
                    {p.sector}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConflictRow({ c }: { c: ConflictOfInterest }) {
  const badgeClass = severityBadge(c.severity);
  return (
    <div className="card-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {c.politicalOrg} → {c.boardOrg}
          </p>
          <p className="text-xs text-[var(--color-fg-muted)] line-clamp-2 mt-1">
            {c.description}
          </p>
          <p className="text-[10px] uppercase text-[var(--color-fg-dim)] mt-2">
            {c.sector}
          </p>
        </div>
        <span
          className={`chip text-[10px] uppercase tracking-wider shrink-0 ${badgeClass}`}
        >
          {c.severity}
        </span>
      </div>
      {c.sources && c.sources.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {c.sources.slice(0, 3).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="chip text-[10px] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] transition"
            >
              {s.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function KaranteneRow({ k }: { k: KaranteneDecision }) {
  return (
    <div className="card-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {k.date}
            {k.classification
              ? ` · ${strings.profile.classification} ${k.classification}`
              : null}
          </p>
          {k.previousRole || k.newOrganization ? (
            <p className="text-xs text-[var(--color-fg-muted)] line-clamp-2 mt-1">
              {[k.previousRole, k.newOrganization].filter(Boolean).join(" → ")}
            </p>
          ) : null}
          {k.reasoning ? (
            <p className="text-xs text-[var(--color-fg-dim)] mt-1 line-clamp-3">
              {k.reasoning}
            </p>
          ) : null}
        </div>
      </div>
      {k.pdfUrl ? (
        <a
          href={k.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-[var(--color-primary)] text-xs font-semibold hover:underline"
        >
          <FileText className="size-3.5" />
          {strings.profile.viewPdf}
        </a>
      ) : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-surface p-4 text-center text-xs text-[var(--color-fg-dim)]">
      {message}
    </div>
  );
}

function categoryIcon(c: TimelinePosition["category"]) {
  if (c === "political" || c === "government") return Landmark;
  return Building2;
}

function riskFillColor(s: ConflictSeverity) {
  switch (s) {
    case "critical":
      return "bg-[var(--color-conflict-high)]";
    case "high":
      return "bg-[var(--color-tertiary)]";
    case "medium":
      return "bg-[var(--color-conflict-medium)]";
    default:
      return "bg-[var(--color-conflict-low)]";
  }
}

function riskTextColor(s: ConflictSeverity) {
  switch (s) {
    case "critical":
      return "text-[var(--color-conflict-high)]";
    case "high":
      return "text-[var(--color-tertiary)]";
    case "medium":
      return "text-[var(--color-conflict-medium)]";
    default:
      return "text-[var(--color-conflict-low)]";
  }
}

function severityBadge(s: ConflictSeverity) {
  switch (s) {
    case "critical":
    case "high":
      return "badge-danger";
    case "medium":
      return "badge-warning";
    default:
      return "badge-success";
  }
}

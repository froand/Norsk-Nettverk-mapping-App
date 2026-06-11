import { LineChart, Activity } from "lucide-react";
import { strings } from "@/lib/strings/nb";

export default function DashboardPage() {
  return (
    <>
      {/* Search */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-low)] border border-[var(--color-border)] px-3 py-2.5">
          <input
            type="search"
            placeholder={strings.search.placeholder}
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--color-fg-dim)] outline-none"
          />
        </div>
      </div>

      <section className="px-4 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.dashboard.intelligenceHeading}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<LineChart className="size-4" />}
            label={strings.dashboard.investigations}
            value="142"
            delta="+8%"
            deltaHint={strings.dashboard.deltaVsLastMonth}
            tone="primary"
          />
          <StatCard
            icon={<Activity className="size-4" />}
            label={strings.dashboard.revolvingDoor}
            value="28"
            delta={strings.dashboard.newCases}
            tone="warning"
          />
        </div>
      </section>

      <section className="px-4 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.dashboard.revolvingDoorFeed}
        </h2>
        <div className="space-y-2">
          <FeedItem
            name="Ola Nordmann"
            from="Finansdepartementet"
            to="Equinor Styre"
            ago="3 timer siden"
            badge={strings.dashboard.badgeRevolvingDoor}
            badgeTone="warning"
          />
          <FeedItem
            name="Astrid Jensen"
            from="Stortingets energi- og miljøkomité"
            to="Ørsted VP"
            ago="9 timer siden"
            badge={strings.dashboard.badgePotentialConflict}
            badgeTone="danger"
          />
          <FeedItem
            name="Magnus Solberg"
            from="Forsvarsdepartementet"
            to="Kongsberg Tech"
            ago="1 dag siden"
            badge={strings.dashboard.analyze}
            badgeTone="primary"
          />
        </div>
      </section>

      <section className="px-4 pt-6 pb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          {strings.dashboard.highConflict}
        </h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
          <PersonScoreCard name="Elena Berg" subtitle="Telenor-rådgiver" score={85} />
          <PersonScoreCard name="Lars Holm" subtitle="MP — Oslo" score={72} />
          <PersonScoreCard name="Sigrid Dahl" subtitle="Equinor styreverv" score={66} />
        </div>
      </section>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
  deltaHint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  deltaHint?: string;
  tone: "primary" | "warning";
}) {
  const deltaColor =
    tone === "warning"
      ? "text-[var(--color-tertiary)]"
      : "text-[var(--color-primary)]";
  return (
    <div className="card-surface p-3">
      <div className="flex items-center gap-2 text-[var(--color-fg-muted)] mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-bold text-[var(--color-primary)] leading-none">
        {value}
      </div>
      <div className={`mt-1 text-xs font-semibold ${deltaColor}`}>
        {delta}
        {deltaHint ? (
          <span className="ml-1 font-normal text-[var(--color-fg-dim)]">
            {deltaHint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FeedItem({
  name,
  from,
  to,
  ago,
  badge,
  badgeTone,
}: {
  name: string;
  from: string;
  to: string;
  ago: string;
  badge: string;
  badgeTone: "warning" | "danger" | "primary";
}) {
  const badgeClass =
    badgeTone === "warning"
      ? "badge-warning"
      : badgeTone === "danger"
        ? "badge-danger"
        : "chip-active";
  return (
    <div className="card-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="size-10 rounded-full bg-[var(--color-secondary-container)] shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{name}</p>
            <p className="text-xs text-[var(--color-fg-muted)] truncate">
              {from} → {to}
            </p>
            <p className="text-[11px] text-[var(--color-fg-dim)] mt-1">{ago}</p>
          </div>
        </div>
        <span
          className={`chip text-[10px] uppercase tracking-wider whitespace-nowrap shrink-0 ${badgeClass}`}
        >
          {badge}
        </span>
      </div>
    </div>
  );
}

function PersonScoreCard({
  name,
  subtitle,
  score,
}: {
  name: string;
  subtitle: string;
  score: number;
}) {
  const tone =
    score >= 80
      ? "border-[var(--color-conflict-high)]/40"
      : score >= 60
        ? "border-[var(--color-tertiary)]/40"
        : "border-[var(--color-border)]";
  return (
    <div
      className={`card-surface ${tone} w-40 shrink-0 p-3 flex flex-col items-center gap-2`}
    >
      <div className="size-16 rounded-full bg-[var(--color-secondary-container)]" />
      <p className="text-sm font-semibold text-center truncate w-full">
        {name}
      </p>
      <p className="text-[11px] text-[var(--color-fg-muted)] text-center truncate w-full">
        {subtitle}
      </p>
      <span className="badge-danger chip mt-1 text-[10px] tracking-wider">
        {score}/100
      </span>
    </div>
  );
}

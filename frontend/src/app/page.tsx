import { Search, User, LineChart, Activity } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
      {/* Top header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-on-primary)] font-bold">
            N
          </div>
          <span className="font-semibold tracking-wide text-sm">
            NORSK NETTVERK
          </span>
        </div>
        <button
          className="size-9 rounded-full bg-[var(--color-surface-high)] flex items-center justify-center"
          aria-label="Profile"
        >
          <User className="size-4" />
        </button>
      </header>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-low)] border border-[var(--color-border)] px-3 py-2.5">
          <Search className="size-4 text-[var(--color-fg-dim)]" />
          <input
            type="search"
            placeholder="Søk politikere eller selskaper..."
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--color-fg-dim)] outline-none"
          />
        </div>
      </div>

      {/* Section: Global Intelligence stats */}
      <section className="px-4 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          Global Intelligence
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<LineChart className="size-4" />}
            label="Undersøkelser"
            value="142"
            delta="+8%"
            tone="primary"
          />
          <StatCard
            icon={<Activity className="size-4" />}
            label="Roterende dør"
            value="28"
            delta="Nye saker"
            tone="warning"
          />
        </div>
      </section>

      {/* Section: Revolving Door feed */}
      <section className="px-4 pt-6 pb-24">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-dim)] mb-3">
          Roterende dør — siste hendelser
        </h2>
        <div className="space-y-2">
          <FeedItem
            name="Ola Nordmann"
            from="Finansdepartementet"
            to="Equinor Styre"
            ago="3 timer siden"
            badge="ROTERENDE DØR"
            badgeTone="warning"
          />
          <FeedItem
            name="Astrid Jensen"
            from="Stortingets energi- og miljøkomité"
            to="Ørsted VP"
            ago="9 timer siden"
            badge="POTENSIELL KONFLIKT"
            badgeTone="danger"
          />
          <FeedItem
            name="Magnus Solberg"
            from="Forsvarsdepartementet"
            to="Kongsberg Tech"
            ago="1 dag siden"
            badge="ANALYSER"
            badgeTone="primary"
          />
        </div>
      </section>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-[var(--color-border)] bg-[var(--color-surface-low)]/90 backdrop-blur">
        <div className="grid grid-cols-4 text-xs font-medium">
          <TabButton label="Dashboard" active />
          <TabButton label="Nettverk" />
          <TabButton label="Katalog" />
          <TabButton label="Varsler" badge={3} />
        </div>
      </nav>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
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
      <div className={`mt-1 text-xs font-semibold ${deltaColor}`}>{delta}</div>
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

function TabButton({
  label,
  active,
  badge,
}: {
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1 py-3 ${
        active
          ? "text-[var(--color-primary)]"
          : "text-[var(--color-fg-muted)]"
      }`}
    >
      <div className="relative">
        <div className="size-5 rounded bg-current opacity-80" />
        {badge ? (
          <span className="absolute -right-2 -top-1 min-w-4 h-4 rounded-full bg-[var(--color-conflict-high)] text-[10px] text-white flex items-center justify-center px-1">
            {badge}
          </span>
        ) : null}
      </div>
      <span>{label}</span>
    </button>
  );
}

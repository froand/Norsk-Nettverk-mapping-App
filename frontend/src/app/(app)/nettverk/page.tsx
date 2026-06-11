import { strings } from "@/lib/strings/nb";

export default function NetworkPage() {
  return (
    <div className="flex flex-col h-[calc(100dvh-9rem)]">
      <div className="px-4 pt-4 flex gap-2 overflow-x-auto scrollbar-hide">
        <span className="chip chip-active">{strings.network.filter.all}</span>
        <span className="chip">{strings.network.filter.energy}</span>
        <span className="chip">{strings.network.filter.parliament}</span>
        <span className="chip">{strings.network.filter.lobby}</span>
      </div>
      <div className="flex-1 mx-4 my-4 rounded-2xl card-surface flex items-center justify-center text-[var(--color-fg-dim)] text-sm">
        Nettverkskart kommer
      </div>
      <div className="px-4 pb-4 flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-fg-dim)] tracking-wider flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--color-tertiary)] animate-pulse" />
          {strings.network.liveFeed}
        </span>
        <button className="chip">{strings.network.legend}</button>
      </div>
    </div>
  );
}

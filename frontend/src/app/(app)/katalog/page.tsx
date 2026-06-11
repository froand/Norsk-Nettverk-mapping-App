import { AlertTriangle } from "lucide-react";
import { strings } from "@/lib/strings/nb";
import { loadKatalog } from "@/lib/katalog-data";
import { KatalogList } from "./katalog-list";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const { rows, partial } = await loadKatalog();

  return (
    <>
      <section className="px-4 pt-4">
        <h1 className="text-xl font-bold">{strings.directory.title}</h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1">
          {strings.directory.subtitle}
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

      <KatalogList rows={rows} />
    </>
  );
}

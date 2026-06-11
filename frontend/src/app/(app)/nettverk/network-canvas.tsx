"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { strings } from "@/lib/strings/nb";
import type {
  ConflictOfInterest,
  GraphData,
  GraphLink,
  GraphNode,
} from "@/lib/api";

// react-force-graph requires window; bypass SSR.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-[var(--color-fg-dim)] text-sm">
      Laster nettverk…
    </div>
  ),
});

type FilterKey = "all" | "political" | "business" | "conflicts";

interface Props {
  overview: GraphData;
  conflicts: ConflictOfInterest[];
}

interface ForceGraphNode {
  id: string;
  name: string;
  type: GraphNode["type"];
  group: string;
  size: number;
  /** Highest conflict severity rank if person has one. */
  conflictRank: number;
  x?: number;
  y?: number;
}

interface ForceGraphLink {
  source: string;
  target: string;
  label: string;
  category: GraphLink["category"];
  /** True if this edge represents a flagged revolving-door tie. */
  conflict: boolean;
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "political", label: "Politisk" },
  { key: "business", label: "Næringsliv" },
  { key: "conflicts", label: "Konflikter" },
];

export function NetworkCanvas({ overview, conflicts }: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<ForceGraphNode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 360, h: 480 });
  // react-force-graph types are loose; use any to bridge.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  // Track container size for responsive sizing.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pre-compute conflict info by personId.
  const conflictByPerson = useMemo(() => {
    const map = new Map<string, { rank: number; count: number }>();
    for (const c of conflicts) {
      const rank = SEVERITY_RANK[c.severity] ?? 0;
      const prev = map.get(c.personId) ?? { rank: 0, count: 0 };
      map.set(c.personId, {
        rank: Math.max(prev.rank, rank),
        count: prev.count + 1,
      });
    }
    return map;
  }, [conflicts]);

  // Build the typed graph data with filters applied.
  const data = useMemo(
    () => buildGraphData(overview, conflictByPerson, filter),
    [overview, conflictByPerson, filter],
  );

  const handleNodeClick = useCallback((node: object) => {
    setSelected(node as ForceGraphNode);
  }, []);

  const closeSheet = useCallback(() => setSelected(null), []);

  return (
    <div className="relative flex flex-col h-full">
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`chip whitespace-nowrap ${filter === f.key ? "chip-active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 mx-4 my-3 rounded-2xl bg-[var(--color-surface-low)] border border-[var(--color-border)] overflow-hidden"
        // Dotted-grid like Stitch design.
        style={{
          backgroundImage:
            "radial-gradient(rgba(126,136,160,0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {/* react-force-graph-2d ships with loose typings; ref handling works at runtime */}
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={size.w}
          height={size.h}
          backgroundColor="transparent"
          cooldownTicks={120}
          warmupTicks={40}
          nodeRelSize={4}
          enableNodeDrag={false}
          minZoom={0.5}
          maxZoom={4}
          onNodeClick={handleNodeClick}
          nodeCanvasObject={(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            node: any,
            ctx: CanvasRenderingContext2D,
            globalScale: number,
          ) => paintNode(node, ctx, globalScale)}
          nodePointerAreaPaint={(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            node: any,
            color: string,
            ctx: CanvasRenderingContext2D,
          ) => paintHitArea(node, color, ctx)}
          linkColor={(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            l: any,
          ) =>
            l.conflict
              ? "rgba(255,185,95,0.7)"
              : l.category === "political" || l.category === "government"
                ? "rgba(122,160,255,0.4)"
                : "rgba(126,136,160,0.35)"
          }
          linkWidth={(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            l: any,
          ) => (l.conflict ? 1.5 : 0.7)}
        />

        <div className="absolute left-3 bottom-3 chip text-[10px] uppercase tracking-wider pointer-events-none">
          {data.nodes.length} {strings.network.legend}
        </div>
      </div>

      {selected ? (
        <BottomSheet node={selected} onClose={closeSheet} />
      ) : null}
    </div>
  );
}

function BottomSheet({
  node,
  onClose,
}: {
  node: ForceGraphNode;
  onClose: () => void;
}) {
  const kindLabel = nodeTypeLabel(node.type);
  const linkable = node.type === "person";
  return (
    <>
      <button
        type="button"
        aria-label="Lukk"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
      />
      <div
        className="fixed left-0 right-0 bottom-16 z-40 bg-[var(--color-surface-high)] border-t border-[var(--color-border)] rounded-t-2xl p-4 max-w-[640px] mx-auto"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-fg-dim)]">
              {kindLabel}
            </p>
            <h3 className="text-lg font-bold leading-tight truncate">{node.name}</h3>
            {node.conflictRank > 0 ? (
              <span className="chip mt-2 badge-warning text-[10px] uppercase tracking-wider">
                Aktiv konflikt
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className="size-9 rounded-full grid place-items-center text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-low)] transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          {linkable ? (
            <Link
              href={`/profile/${encodeURIComponent(node.id)}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] text-sm font-semibold"
            >
              Åpne profil
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <p className="flex-1 text-xs text-[var(--color-fg-dim)]">
              {node.type === "political_party"
                ? "Politisk parti"
                : "Organisasjon"}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function buildGraphData(
  overview: GraphData,
  conflictByPerson: Map<string, { rank: number; count: number }>,
  filter: FilterKey,
): { nodes: ForceGraphNode[]; links: ForceGraphLink[] } {
  const nodeById = new Map<string, GraphNode>();
  for (const n of overview.nodes) nodeById.set(n.id, n);

  // Compute degree per node to size them by importance.
  const degree = new Map<string, number>();
  for (const l of overview.links) {
    const src = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
    const tgt = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
    degree.set(src, (degree.get(src) ?? 0) + 1);
    degree.set(tgt, (degree.get(tgt) ?? 0) + 1);
  }

  // Filter links first; the node set follows.
  const filteredLinks = overview.links.filter((l) => {
    if (filter === "political") {
      return l.category === "political" || l.category === "government";
    }
    if (filter === "business") {
      return l.category === "board" || l.category === "executive";
    }
    if (filter === "conflicts") {
      const src = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
      const tgt = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
      return conflictByPerson.has(src) || conflictByPerson.has(tgt);
    }
    return true;
  });

  // Keep only nodes that are still connected.
  const keepIds = new Set<string>();
  for (const l of filteredLinks) {
    const src = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
    const tgt = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
    keepIds.add(src);
    keepIds.add(tgt);
  }
  // For "conflicts" mode also keep isolated persons with conflicts.
  if (filter === "conflicts") {
    for (const id of conflictByPerson.keys()) keepIds.add(id);
  }

  const nodes: ForceGraphNode[] = [...keepIds]
    .map((id) => nodeById.get(id))
    .filter((n): n is GraphNode => !!n)
    .map((n) => {
      const conflictInfo = conflictByPerson.get(n.id);
      const deg = degree.get(n.id) ?? 0;
      return {
        id: n.id,
        name: n.name,
        type: n.type,
        group: n.group,
        size: 4 + Math.min(deg, 8),
        conflictRank: conflictInfo?.rank ?? 0,
      };
    });

  const links: ForceGraphLink[] = filteredLinks.map((l) => {
    const src = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
    const tgt = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
    const personId = nodeById.get(src)?.type === "person" ? src : tgt;
    const isConflict =
      (conflictByPerson.get(personId)?.rank ?? 0) >= SEVERITY_RANK.medium &&
      (l.category === "board" || l.category === "executive");
    return {
      source: src,
      target: tgt,
      label: l.label,
      category: l.category,
      conflict: isConflict,
    };
  });

  return { nodes, links };
}

function nodeColor(node: ForceGraphNode): string {
  if (node.type === "person") {
    if (node.conflictRank >= 3) return "#ffb95f"; // tertiary - high conflict
    if (node.conflictRank >= 2) return "#ffd699"; // medium conflict
    return "#7aa0ff"; // primary cyan
  }
  if (node.type === "political_party") return "#bec6e0"; // light blue
  if (node.type === "government_body") return "#abb9d2";
  return "#5b6b85"; // companies muted
}

function paintNode(
  node: ForceGraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
): void {
  if (node.x == null || node.y == null) return;
  const r = node.size;
  ctx.beginPath();
  ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
  ctx.fillStyle = nodeColor(node);
  ctx.fill();
  if (node.conflictRank > 0) {
    ctx.strokeStyle = "rgba(255,185,95,0.9)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // Only label at higher zoom levels or for big nodes (avoid clutter).
  if (globalScale >= 1.6 || node.size >= 10) {
    const fontSize = Math.max(2.5, 10 / globalScale);
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#d4e4fa";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const label =
      node.name.length > 28 ? node.name.slice(0, 26) + "…" : node.name;
    ctx.fillText(label, node.x, node.y + r + 1);
  }
}

function paintHitArea(
  node: ForceGraphNode,
  color: string,
  ctx: CanvasRenderingContext2D,
): void {
  if (node.x == null || node.y == null) return;
  ctx.beginPath();
  ctx.arc(node.x, node.y, Math.max(node.size + 6, 10), 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
}

function nodeTypeLabel(t: GraphNode["type"]): string {
  if (t === "person") return "Person";
  if (t === "political_party") return "Politisk parti";
  if (t === "government_body") return "Offentlig organ";
  return "Selskap";
}

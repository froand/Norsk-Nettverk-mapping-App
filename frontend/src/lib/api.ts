/**
 * Norsk Nettverk v2 — minimal API client.
 * Mirrors the v1 backend's REST API (forked into this repo's backend/).
 *
 * - `API_URL` is read in Server Components (server-only).
 * - `NEXT_PUBLIC_API_URL` is the browser-visible fallback.
 * - Per-call `cache`/`next.revalidate` options can be passed via opts.
 */

// Types are intentionally inlined (not imported from backend) so the
// frontend remains a standalone deployable package.
export interface Person {
  id: string;
  name: string;
  type: "person";
}

export interface Organization {
  id: string;
  name: string;
  type: "company" | "political_party" | "government_body";
  orgNumber?: string;
}

export type RoleCategory = "board" | "political" | "government" | "executive";

export interface Role {
  id: string;
  personId: string;
  organizationId: string;
  role: string;
  category: RoleCategory;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
}

export type GraphNode = {
  id: string;
  name: string;
  type: "person" | "company" | "political_party" | "government_body";
  group: string;
  imageUrl?: string;
  meta?: {
    party?: string;
    fylke?: string;
    stortingetId?: string;
  };
};

export type GraphLink = {
  source: string;
  target: string;
  label: string;
  category: RoleCategory;
};

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface TimelinePosition {
  orgId: string;
  orgName: string;
  role: string;
  category: RoleCategory;
  sector?: string;
  startYear: number;
  endYear?: number;
}

export interface PositionTimeline {
  personId: string;
  personName: string;
  positions: TimelinePosition[];
}

export type ConflictType =
  | "revolving_door"
  | "concurrent"
  | "sector_overlap"
  | "shared_network";

export type ConflictSeverity = "critical" | "high" | "medium" | "low";

export interface ConflictOfInterest {
  personId: string;
  personName: string;
  politicalRole: string;
  politicalOrg: string;
  boardRole: string;
  boardOrg: string;
  sector: string;
  conflictType: ConflictType;
  description: string;
  severity: ConflictSeverity;
  classification?: "A" | "B" | "C" | "D";
  sources?: { label: string; url: string }[];
}

export interface KaranteneDecision {
  id: string;
  personName: string;
  date: string;
  previousRole: string;
  previousDepartment: string;
  newRole: string;
  newOrganization: string;
  quarantineMonths: number;
  restrictionMonths: number;
  reasoning: string;
  pdfUrl?: string;
  year?: number;
  classification?: "A" | "B" | "C" | "D";
}

export interface PersonPosition {
  title: string;
  organization: string;
  type: "political" | "government" | "private" | "board" | "committee";
  startYear?: number;
  endYear?: number | null;
  isCurrent: boolean;
  description?: string;
}

export interface PersonDetails {
  id: string;
  name: string;
  party?: string;
  fylke?: string;
  email?: string;
  birthYear?: number;
  imageUrl?: string;
  committees?: string[];
  currentPositions: PersonPosition[];
  pastPositions: PersonPosition[];
}

export const API_BASE =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3011";

type GetOpts = {
  /** Default: 60s ISR. Pass 0 for no caching, or override per call. */
  revalidate?: number | false;
  cache?: RequestCache;
  signal?: AbortSignal;
};

async function get<T>(path: string, opts: GetOpts = {}): Promise<T> {
  const init: RequestInit & { next?: { revalidate?: number | false } } = {
    headers: { Accept: "application/json" },
    signal: opts.signal,
  };
  if (opts.cache) {
    init.cache = opts.cache;
  } else {
    init.next = { revalidate: opts.revalidate ?? 60 };
  }
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  overview: (opts?: GetOpts) => get<GraphData>("/api/graph/overview", opts),
  conflicts: (opts?: GetOpts) =>
    get<ConflictOfInterest[]>("/api/graph/conflicts", opts),
  conflictsForPerson: (personId: string, opts?: GetOpts) =>
    get<ConflictOfInterest[]>(
      `/api/graph/conflicts/${encodeURIComponent(personId)}`,
      opts,
    ),
  timelines: (opts?: GetOpts) =>
    get<PositionTimeline[]>("/api/graph/timelines", opts),
  timeline: (personId: string, opts?: GetOpts) =>
    get<PositionTimeline>(
      `/api/graph/timeline/${encodeURIComponent(personId)}`,
      opts,
    ),
  personDetails: (personId: string, opts?: GetOpts) =>
    get<PersonDetails>(
      `/api/graph/person-details/${encodeURIComponent(personId)}`,
      opts,
    ),
  personNetwork: (personId: string, opts?: GetOpts) =>
    get<GraphData>(`/api/graph/person/${encodeURIComponent(personId)}`, opts),
  karanteneList: (opts?: GetOpts) =>
    get<KaranteneDecision[]>("/api/karantene", opts),
  search: (q: string, opts?: GetOpts) =>
    get<{ persons: Person[]; organizations: Organization[] }>(
      `/api/search?q=${encodeURIComponent(q)}`,
      opts,
    ),
  karantene: (personId: string, opts?: GetOpts) =>
    get<KaranteneDecision[]>(
      `/api/karantene/${encodeURIComponent(personId)}`,
      opts,
    ),
};

/**
 * Norsk Nettverk v2 — minimal API client.
 * Mirrors the v1 backend's REST API (forked into this repo's backend/).
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

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  graph: () => get<GraphData>("/api/graph"),
  search: (q: string) =>
    get<{ persons: Person[]; organizations: Organization[] }>(
      `/api/search?q=${encodeURIComponent(q)}`,
    ),
  karantene: (personId: string) =>
    get<{ person: string; decisions: { title: string; pdfUrl: string }[] }>(
      `/api/karantene/${encodeURIComponent(personId)}`,
    ),
};

export { BASE as API_BASE };

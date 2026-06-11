import { Router } from 'express';
import { getCompanyRoles, getPersonRolesNetwork } from '../services/brreg.js';
import { getPoliticalData, getPersonPoliticalNetwork, getPersonTimeline, getAllTimelines, getConflictsForPerson, getAllConflicts } from '../services/political-data.js';
import { getPartyRepresentatives, getPersonDetails } from '../services/stortinget.js';
import type { GraphData } from '../types.js';

export const graphRoutes = Router();

// Get full overview graph (political data + optional company data)
graphRoutes.get('/overview', async (_req, res) => {
  const data = getPoliticalData();
  res.json(data);
});

// Get graph centered on a specific person (combines political + brreg data)
graphRoutes.get('/person/:personId', async (req, res) => {
  const { personId } = req.params;

  // Get political connections
  const political = getPersonPoliticalNetwork(personId);

  // Also try to find their brreg roles by extracting the name from the ID
  const personName = personId
    .replace('person-', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let brreg: GraphData = { nodes: [], links: [] };
  try {
    brreg = await getPersonRolesNetwork(personName);
  } catch (e) {
    console.error('Failed to fetch brreg roles for person:', e);
  }

  // Merge both
  const merged = mergeGraphData(political, brreg);
  res.json(merged);
});

// Get graph for a company (from brreg.no)
graphRoutes.get('/company/:orgNumber', async (req, res) => {
  const { orgNumber } = req.params;
  try {
    const data = await getCompanyRoles(orgNumber);
    res.json(data);
  } catch (error) {
    console.error('Company graph error:', error);
    res.status(500).json({ error: 'Failed to fetch company data' });
  }
});

// Search a person by name and get all their roles
graphRoutes.get('/person-by-name/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const political = getPersonPoliticalNetwork(
      `person-${name.toLowerCase().replace(/\s+/g, '-')}`
    );
    const brreg = await getPersonRolesNetwork(name);
    const merged = mergeGraphData(political, brreg);
    res.json(merged);
  } catch (error) {
    console.error('Person search error:', error);
    res.status(500).json({ error: 'Failed to fetch person data' });
  }
});

// Merge multiple data sources for a combined graph
graphRoutes.get('/expand/:nodeId', async (req, res) => {
  const { nodeId } = req.params;

  const result: GraphData = { nodes: [], links: [] };

  // If it's a person, get their political network + brreg roles
  if (nodeId.startsWith('person-')) {
    const political = getPersonPoliticalNetwork(nodeId);
    result.nodes.push(...political.nodes);
    result.links.push(...political.links);

    const personName = nodeId
      .replace('person-', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    try {
      const brreg = await getPersonRolesNetwork(personName);
      result.nodes.push(...brreg.nodes);
      result.links.push(...brreg.links);
    } catch (e) {
      // continue with what we have
    }
  }

  // If it's a company with org number, fetch from brreg
  if (nodeId.startsWith('org-') && /^\d+$/.test(nodeId.replace('org-', ''))) {
    const orgNumber = nodeId.replace('org-', '');
    const companyData = await getCompanyRoles(orgNumber);
    result.nodes.push(...companyData.nodes);
    result.links.push(...companyData.links);
  }

  // If it's a political party, fetch representatives from Stortinget
  if (nodeId.startsWith('org-') && !(/^\d+$/.test(nodeId.replace('org-', '')))) {
    try {
      const partyData = await getPartyRepresentatives(nodeId);
      result.nodes.push(...partyData.nodes);
      result.links.push(...partyData.links);
    } catch (e) {
      // continue without stortinget data
    }
  }

  res.json(result);
});

function mergeGraphData(a: GraphData, b: GraphData): GraphData {
  const nodeMap = new Map(a.nodes.map((n) => [n.id, n]));
  for (const node of b.nodes) {
    if (!nodeMap.has(node.id)) nodeMap.set(node.id, node);
  }

  const linkSet = new Set(a.links.map((l) => `${l.source}-${l.target}-${l.label}`));
  const links = [...a.links];
  for (const link of b.links) {
    const key = `${link.source}-${link.target}-${link.label}`;
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push(link);
    }
  }

  return { nodes: Array.from(nodeMap.values()), links };
}

// Timeline endpoints
graphRoutes.get('/timeline/:personId', async (req, res) => {
  const { personId } = req.params;

  // First check curated timelines
  const timeline = getPersonTimeline(personId);
  if (timeline) {
    res.json(timeline);
    return;
  }

  // Fallback: generate timeline from person details (KNOWN_POSITIONS + Stortinget API)
  try {
    const details = await getPersonDetails(personId);
    if (details) {
      const allPositions = [...details.currentPositions, ...details.pastPositions];
      if (allPositions.length > 0) {
        const categoryMap: Record<string, 'political' | 'government' | 'board' | 'executive'> = {
          political: 'political',
          government: 'government',
          private: 'executive',
          board: 'board',
          committee: 'political',
        };

        const positions = allPositions
          .filter((p: { startYear?: number }) => p.startYear)
          .map((p: { organization: string; title: string; type: string; startYear?: number; endYear?: number | null }) => ({
            orgId: `org-${p.organization.toLowerCase().replace(/\s+/g, '-')}`,
            orgName: p.organization,
            role: p.title,
            category: categoryMap[p.type] || 'political',
            startYear: p.startYear!,
            endYear: p.endYear === null ? undefined : p.endYear,
          }));

        if (positions.length > 0) {
          res.json({
            personId,
            personName: details.name,
            positions,
          });
          return;
        }
      }
    }
  } catch (e) {
    console.error('Failed to generate timeline from person details:', e);
  }

  res.status(404).json({ error: 'No timeline data for this person' });
});

graphRoutes.get('/timelines', (_req, res) => {
  res.json(getAllTimelines());
});

// Conflict of interest endpoints
graphRoutes.get('/conflicts', (_req, res) => {
  res.json(getAllConflicts());
});

graphRoutes.get('/conflicts/:personId', (req, res) => {
  const { personId } = req.params;
  res.json(getConflictsForPerson(personId));
});

// Degrees of separation — BFS shortest path between two nodes
graphRoutes.get('/shortest-path', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: 'from and to query params required' });
    return;
  }
  const data = getPoliticalData();
  const path = findShortestPath(data, from as string, to as string);
  res.json({ path });
});

// Cluster detection — find groups of people sharing multiple connections
graphRoutes.get('/clusters', (_req, res) => {
  const data = getPoliticalData();
  const clusters = detectClusters(data);
  res.json(clusters);
});

// Person details with positions
graphRoutes.get('/person-details/:personId', async (req, res) => {
  const { personId } = req.params;
  try {
    const details = await getPersonDetails(personId);
    if (details) {
      res.json(details);
      return;
    }

    // Fallback: build details from curated graph data (links/nodes)
    const politicalData = getPoliticalData();
    const personNode = politicalData.nodes.find(n => n.id === personId);
    if (!personNode) {
      res.status(404).json({ error: 'Person not found' });
      return;
    }

    // Find all links for this person
    const personLinks = politicalData.links.filter(
      l => l.source === personId || l.target === personId
    );

    const currentPositions: { title: string; organization: string; type: string; startYear?: number; endYear?: number; isCurrent: boolean }[] = [];
    const pastPositions: { title: string; organization: string; type: string; startYear?: number; endYear?: number; isCurrent: boolean }[] = [];
    let party: string | undefined;

    for (const link of personLinks) {
      const targetId = link.source === personId ? link.target : link.source;
      const targetNode = politicalData.nodes.find(n => n.id === targetId);
      if (!targetNode) continue;

      const label = (link as any).label || '';
      const category = (link as any).category || '';
      const isCurrent = !label.toLowerCase().includes('tidl');
      const type = category === 'political' ? 'political'
        : category === 'government' ? 'government'
        : category === 'executive' ? 'private'
        : 'board';

      // Detect party from political links to party nodes
      if (targetNode.group === 'party' || targetNode.type === 'political_party') {
        party = targetNode.name;
      }

      const position = {
        title: label || 'Medlem',
        organization: targetNode.name,
        type,
        isCurrent,
      };

      if (isCurrent) {
        currentPositions.push(position);
      } else {
        pastPositions.push(position);
      }
    }

    res.json({
      id: personId,
      name: personNode.name,
      party,
      fylke: undefined,
      email: undefined,
      birthYear: undefined,
      imageUrl: undefined,
      committees: undefined,
      currentPositions,
      pastPositions,
    });
  } catch (e) {
    console.error('Error fetching person details:', e);
    res.status(500).json({ error: 'Failed to fetch person details' });
  }
});

// BFS shortest path between two nodes
function findShortestPath(data: GraphData, fromId: string, toId: string): { nodes: string[]; links: { source: string; target: string; label: string }[] } | null {
  if (fromId === toId) return { nodes: [fromId], links: [] };

  // Build adjacency list
  const adj = new Map<string, { neighbor: string; label: string }[]>();
  for (const node of data.nodes) {
    adj.set(node.id, []);
  }
  for (const link of data.links) {
    const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
    const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;
    adj.get(src)?.push({ neighbor: tgt, label: link.label });
    adj.get(tgt)?.push({ neighbor: src, label: link.label });
  }

  // BFS
  const visited = new Set<string>([fromId]);
  const parent = new Map<string, { node: string; label: string }>();
  const queue: string[] = [fromId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current) || [];
    for (const { neighbor, label } of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, { node: current, label });
        if (neighbor === toId) {
          // Reconstruct path
          const nodes: string[] = [];
          const links: { source: string; target: string; label: string }[] = [];
          let cur = toId;
          while (cur !== fromId) {
            nodes.unshift(cur);
            const p = parent.get(cur)!;
            links.unshift({ source: p.node, target: cur, label: p.label });
            cur = p.node;
          }
          nodes.unshift(fromId);
          return { nodes, links };
        }
        queue.push(neighbor);
      }
    }
  }
  return null;
}

// Detect clusters of people sharing multiple organizational connections
interface Cluster {
  id: string;
  members: { id: string; name: string }[];
  sharedOrgs: { id: string; name: string }[];
  strength: number;
}

function detectClusters(data: GraphData): Cluster[] {
  // Map person -> set of orgs they connect to
  const personOrgs = new Map<string, Set<string>>();
  const personNodes = data.nodes.filter(n => n.type === 'person');
  const orgNodes = new Map(data.nodes.filter(n => n.type !== 'person').map(n => [n.id, n]));
  const personMap = new Map(personNodes.map(n => [n.id, n]));

  for (const link of data.links) {
    const src = typeof link.source === 'string' ? link.source : (link.source as any).id;
    const tgt = typeof link.target === 'string' ? link.target : (link.target as any).id;

    if (personMap.has(src) && orgNodes.has(tgt)) {
      if (!personOrgs.has(src)) personOrgs.set(src, new Set());
      personOrgs.get(src)!.add(tgt);
    }
    if (personMap.has(tgt) && orgNodes.has(src)) {
      if (!personOrgs.has(tgt)) personOrgs.set(tgt, new Set());
      personOrgs.get(tgt)!.add(src);
    }
  }

  // Find pairs of people sharing 2+ orgs
  const clusters: Cluster[] = [];
  const persons = Array.from(personOrgs.entries());
  const usedPairs = new Set<string>();

  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const [p1Id, p1Orgs] = persons[i];
      const [p2Id, p2Orgs] = persons[j];
      const shared = [...p1Orgs].filter(o => p2Orgs.has(o));
      if (shared.length >= 2) {
        const key = [p1Id, p2Id].sort().join('|');
        if (!usedPairs.has(key)) {
          usedPairs.add(key);
          clusters.push({
            id: `cluster-${clusters.length}`,
            members: [
              { id: p1Id, name: personMap.get(p1Id)?.name || p1Id },
              { id: p2Id, name: personMap.get(p2Id)?.name || p2Id },
            ],
            sharedOrgs: shared.map(orgId => ({
              id: orgId,
              name: orgNodes.get(orgId)?.name || orgId,
            })),
            strength: shared.length,
          });
        }
      }
    }
  }

  return clusters.sort((a, b) => b.strength - a.strength);
}

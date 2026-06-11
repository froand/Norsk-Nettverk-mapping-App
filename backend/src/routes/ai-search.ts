import { Router } from 'express';
import { getAllConflicts, getAllTimelines, getPoliticalData } from '../services/political-data.js';
import type { GraphData } from '../types.js';

type RelationCategory = 'board' | 'political' | 'government' | 'executive';
type ConflictClassification = 'A' | 'B' | 'C' | 'D';

interface AiSearchPlan {
  explanation?: string;
  peopleMustConnectToAllOrganizations?: string[];
  peopleMustConnectToAnyOrganizations?: string[];
  personNameIncludes?: string[];
  requiredRelationCategories?: RelationCategory[];
  transitionFromCategories?: RelationCategory[];
  transitionToCategories?: RelationCategory[];
  conflictClassifications?: ConflictClassification[];
  limit?: number;
}

interface AzureChatToolCall {
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface AzureChatResponse {
  choices?: {
    message?: {
      tool_calls?: AzureChatToolCall[];
      content?: string;
    };
  }[];
}

const DEFAULT_AZURE_API_VERSION = '2024-06-01';
const MAX_RESULTS = 30;

export const aiSearchRoutes = Router();

aiSearchRoutes.post('/search', async (req, res) => {
  const query = (req.body?.query as string | undefined)?.trim();
  if (!query || query.length < 3) {
    res.status(400).json({ error: 'Query must be at least 3 characters' });
    return;
  }

  try {
    const graphData = getPoliticalData();
    const conflicts = getAllConflicts();
    const timelines = getAllTimelines();

    const plan = await interpretQuery(query, graphData);
    const result = applyPlan(plan, graphData, conflicts, timelines);

    res.json({
      query,
      explanation: buildExplanation(query, plan, result.people.map((p) => p.name)),
      matchedNodeIds: result.matchNodeIds,
      matchedNodes: result.people,
      totalMatches: result.people.length,
    });
  } catch (error) {
    console.error('AI search failed:', error);
    res.status(500).json({ error: 'AI search failed' });
  }
});

async function interpretQuery(query: string, graphData: GraphData): Promise<AiSearchPlan> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_AZURE_API_VERSION;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure OpenAI is not configured');
  }

  const people = graphData.nodes
    .filter((node) => node.type === 'person')
    .map((node) => node.name);
  const organizations = graphData.nodes
    .filter((node) => node.type !== 'person')
    .map((node) => node.name);

  const response = await fetch(
    `${endpoint.replace(/\/+$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: [
              'You convert natural language graph questions into a strict filter plan.',
              'Always call the build_graph_query tool.',
              'Only include organizations and people that are present in the provided lists.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              query,
              availablePeople: people,
              availableOrganizations: organizations,
              relationCategories: ['board', 'political', 'government', 'executive'],
              conflictClassifications: ['A', 'B', 'C', 'D'],
            }),
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'build_graph_query',
              description: 'Build a structured graph filter plan for person-centric matching',
              parameters: {
                type: 'object',
                properties: {
                  explanation: { type: 'string' },
                  peopleMustConnectToAllOrganizations: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  peopleMustConnectToAnyOrganizations: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  personNameIncludes: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  requiredRelationCategories: {
                    type: 'array',
                    items: { type: 'string', enum: ['board', 'political', 'government', 'executive'] },
                  },
                  transitionFromCategories: {
                    type: 'array',
                    items: { type: 'string', enum: ['board', 'political', 'government', 'executive'] },
                  },
                  transitionToCategories: {
                    type: 'array',
                    items: { type: 'string', enum: ['board', 'political', 'government', 'executive'] },
                  },
                  conflictClassifications: {
                    type: 'array',
                    items: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                  },
                  limit: { type: 'number' },
                },
              },
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: {
            name: 'build_graph_query',
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Azure OpenAI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as AzureChatResponse;
  const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0];
  const args = toolCall?.function?.arguments;
  if (!args) {
    throw new Error('Azure OpenAI returned no tool arguments');
  }

  return JSON.parse(args) as AiSearchPlan;
}

function applyPlan(
  plan: AiSearchPlan,
  graphData: GraphData,
  conflicts: ReturnType<typeof getAllConflicts>,
  timelines: ReturnType<typeof getAllTimelines>
) {
  const personNodes = graphData.nodes.filter((node) => node.type === 'person');
  const nodeMap = new Map(graphData.nodes.map((node) => [node.id, node]));

  const orgIdsByTerm = new Set<string>();
  for (const term of plan.peopleMustConnectToAllOrganizations || []) {
    resolveOrgIds(graphData, term).forEach((id) => orgIdsByTerm.add(id));
  }
  for (const term of plan.peopleMustConnectToAnyOrganizations || []) {
    resolveOrgIds(graphData, term).forEach((id) => orgIdsByTerm.add(id));
  }

  const conflictMatchIds = new Set(
    conflicts
      .filter((conflict) =>
        !plan.conflictClassifications?.length ||
        (conflict.classification && plan.conflictClassifications.includes(conflict.classification))
      )
      .map((conflict) => conflict.personId)
  );

  const matches = personNodes.filter((person) => {
    if (plan.personNameIncludes?.length) {
      const personName = person.name.toLowerCase();
      if (!plan.personNameIncludes.some((term) => personName.includes(term.toLowerCase()))) {
        return false;
      }
    }

    const connections = getPersonConnections(person.id, graphData);
    if (plan.peopleMustConnectToAllOrganizations?.length) {
      const requiredOrgIds = plan.peopleMustConnectToAllOrganizations.flatMap((term) => resolveOrgIds(graphData, term));
      if (requiredOrgIds.length > 0 && !requiredOrgIds.every((orgId) => connections.orgIds.has(orgId))) {
        return false;
      }
    }

    if (plan.peopleMustConnectToAnyOrganizations?.length) {
      const anyOrgIds = plan.peopleMustConnectToAnyOrganizations.flatMap((term) => resolveOrgIds(graphData, term));
      if (anyOrgIds.length > 0 && !anyOrgIds.some((orgId) => connections.orgIds.has(orgId))) {
        return false;
      }
    }

    if (plan.requiredRelationCategories?.length) {
      if (!plan.requiredRelationCategories.some((category) => connections.categories.has(category))) {
        return false;
      }
    }

    if (plan.conflictClassifications?.length && !conflictMatchIds.has(person.id)) {
      return false;
    }

    if (plan.transitionFromCategories?.length && plan.transitionToCategories?.length) {
      const timeline = timelines.find((entry) => entry.personId === person.id);
      if (!timeline || !hasTransition(timeline.positions, plan.transitionFromCategories, plan.transitionToCategories)) {
        return false;
      }
    }

    return true;
  });

  const limit = Math.min(Math.max(plan.limit || MAX_RESULTS, 1), MAX_RESULTS);
  const limitedPeople = matches.slice(0, limit);
  const matchNodeIds = new Set<string>();
  limitedPeople.forEach((person) => {
    matchNodeIds.add(person.id);
    const connections = getPersonConnections(person.id, graphData);
    connections.orgIds.forEach((orgId) => {
      if (orgIdsByTerm.has(orgId)) {
        matchNodeIds.add(orgId);
      }
    });
  });

  const people = limitedPeople
    .map((person) => nodeMap.get(person.id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .map((node) => ({ id: node.id, name: node.name, type: node.type }));

  return {
    people,
    matchNodeIds: Array.from(matchNodeIds),
  };
}

function buildExplanation(query: string, plan: AiSearchPlan, names: string[]) {
  const summary = plan.explanation?.trim()
    ? plan.explanation.trim()
    : `Processed query: "${query}"`;
  if (names.length === 0) {
    return `${summary} No matching people were found in the current graph dataset.`;
  }
  return `${summary} Matched ${names.length} ${names.length === 1 ? 'person' : 'people'}: ${names.join(', ')}.`;
}

function resolveOrgIds(graphData: GraphData, orgTerm: string): string[] {
  const query = orgTerm.trim().toLowerCase();
  if (!query) return [];
  return graphData.nodes
    .filter((node) => node.type !== 'person' && node.name.toLowerCase().includes(query))
    .map((node) => node.id);
}

function getPersonConnections(personId: string, graphData: GraphData) {
  const orgIds = new Set<string>();
  const categories = new Set<RelationCategory>();

  graphData.links.forEach((link) => {
    if (link.source === personId) {
      orgIds.add(link.target);
      categories.add(link.category);
    } else if (link.target === personId) {
      orgIds.add(link.source);
      categories.add(link.category);
    }
  });

  return { orgIds, categories };
}

function hasTransition(
  positions: { category: RelationCategory; startYear: number; endYear?: number }[],
  fromCategories: RelationCategory[],
  toCategories: RelationCategory[]
) {
  const sorted = [...positions].sort((a, b) => a.startYear - b.startYear);
  for (let i = 0; i < sorted.length; i++) {
    if (!fromCategories.includes(sorted[i].category)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      if (toCategories.includes(sorted[j].category)) {
        return true;
      }
    }
  }
  return false;
}

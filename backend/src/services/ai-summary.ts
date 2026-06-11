import { AzureOpenAI } from 'openai';
import '@azure/openai/types';
import { getPersonDetails } from './stortinget.js';
import { getConflictsForPerson, getPersonPoliticalNetwork, getPersonTimeline } from './political-data.js';

interface CachedSummary {
  summary: string;
  generatedAt: string;
}

export interface PersonSummaryResponse {
  personId: string;
  summary: string;
  generatedAt: string;
}

const summaryCache = new Map<string, CachedSummary>();

let cachedClient: AzureOpenAI | null = null;
let cachedDeployment: string | null = null;

function getAzureClient(): { client: AzureOpenAI; deployment: string } {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure OpenAI is not configured');
  }

  if (!cachedClient) {
    cachedClient = new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion: '2024-10-21',
      deployment,
    });
    cachedDeployment = deployment;
  }

  return { client: cachedClient, deployment: cachedDeployment || deployment };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function getPersonSummary(personId: string): Promise<PersonSummaryResponse | null> {
  const cached = summaryCache.get(personId);
  if (cached) {
    return {
      personId,
      summary: cached.summary,
      generatedAt: cached.generatedAt,
    };
  }

  const [details, timeline] = await Promise.all([
    getPersonDetails(personId),
    Promise.resolve(getPersonTimeline(personId)),
  ]);
  const conflicts = getConflictsForPerson(personId);
  const network = getPersonPoliticalNetwork(personId);

  const companies = dedupe(
    network.nodes
      .filter((n) => n.type === 'company')
      .map((n) => n.name)
  );

  const currentPositions = details?.currentPositions.map((p) => ({
    title: p.title,
    organization: p.organization,
    type: p.type,
    startYear: p.startYear,
    endYear: p.endYear,
  })) || [];

  const pastPositions = details?.pastPositions.map((p) => ({
    title: p.title,
    organization: p.organization,
    type: p.type,
    startYear: p.startYear,
    endYear: p.endYear,
  })) || [];

  if (
    !details
    && !timeline
    && conflicts.length === 0
    && companies.length === 0
    && currentPositions.length === 0
    && pastPositions.length === 0
  ) {
    return null;
  }

  const personData = {
    personId,
    name: details?.name || network.nodes.find((n) => n.id === personId)?.name || personId,
    party: details?.party,
    county: details?.fylke,
    committees: details?.committees || [],
    currentPositions,
    pastPositions,
    timeline: timeline?.positions || [],
    companies,
    conflicts: conflicts.map((c) => ({
      type: c.conflictType,
      severity: c.severity,
      description: c.description,
      politicalRole: c.politicalRole,
      politicalOrg: c.politicalOrg,
      boardRole: c.boardRole,
      boardOrg: c.boardOrg,
      sector: c.sector,
    })),
  };

  const { client, deployment } = getAzureClient();
  const completion = await client.chat.completions.create({
    model: deployment,
    temperature: 0.1,
    max_tokens: 350,
    messages: [
      {
        role: 'system',
        content: 'You are a factual analyst. Summarize only facts from provided data. Keep a neutral tone, 4-6 sentences, and do not speculate.',
      },
      {
        role: 'user',
        content: `Create a concise factual summary for this person in Norwegian:\n${JSON.stringify(personData)}`,
      },
    ],
  });

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error('AI summary generation returned no content');
  }

  const generatedAt = new Date().toISOString();
  summaryCache.set(personId, { summary, generatedAt });

  return { personId, summary, generatedAt };
}

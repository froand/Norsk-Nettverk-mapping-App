import { getPoliticalData } from './political-data.js';
import { getAllTimelines, getAllConflicts } from './political-data.js';
import type { ConflictOfInterest } from './political-data.js';

export interface AiDetectedConflict extends ConflictOfInterest {
  confidenceScore: number;
  explanation: string;
  sourceType: 'ai_suggested';
  dismissKey: string;
}

interface AzureChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

const CONFLICT_TYPES = new Set<ConflictOfInterest['conflictType']>([
  'revolving_door',
  'concurrent',
  'sector_overlap',
  'shared_network',
]);

const SEVERITIES = new Set<ConflictOfInterest['severity']>([
  'critical',
  'high',
  'medium',
  'low',
]);

const CLASSIFICATIONS = new Set<NonNullable<ConflictOfInterest['classification']>>([
  'A',
  'B',
  'C',
  'D',
]);

function buildDismissKey(conflict: Pick<ConflictOfInterest, 'personId' | 'conflictType' | 'boardOrg' | 'boardRole'>): string {
  return `${conflict.personId}|${conflict.conflictType}|${conflict.boardOrg}|${conflict.boardRole}`.toLowerCase();
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(2));
}

function toAiDetectedConflicts(payload: unknown): AiDetectedConflict[] {
  if (!payload || typeof payload !== 'object' || !('conflicts' in payload)) return [];
  const rawConflicts = (payload as { conflicts?: unknown }).conflicts;
  if (!Array.isArray(rawConflicts)) return [];

  const parsed: AiDetectedConflict[] = [];
  for (const item of rawConflicts) {
    if (!item || typeof item !== 'object') continue;

    const conflictType = safeString((item as { conflictType?: unknown }).conflictType) as ConflictOfInterest['conflictType'];
    const severity = safeString((item as { severity?: unknown }).severity) as ConflictOfInterest['severity'];
    const classificationValue = safeString((item as { classification?: unknown }).classification);
    const classification = CLASSIFICATIONS.has(classificationValue as NonNullable<ConflictOfInterest['classification']>)
      ? (classificationValue as NonNullable<ConflictOfInterest['classification']>)
      : undefined;

    if (!CONFLICT_TYPES.has(conflictType) || !SEVERITIES.has(severity)) continue;

    const normalized: AiDetectedConflict = {
      personId: safeString((item as { personId?: unknown }).personId),
      personName: safeString((item as { personName?: unknown }).personName),
      politicalRole: safeString((item as { politicalRole?: unknown }).politicalRole),
      politicalOrg: safeString((item as { politicalOrg?: unknown }).politicalOrg),
      boardRole: safeString((item as { boardRole?: unknown }).boardRole),
      boardOrg: safeString((item as { boardOrg?: unknown }).boardOrg),
      sector: safeString((item as { sector?: unknown }).sector),
      conflictType,
      description: safeString((item as { description?: unknown }).description),
      severity,
      classification,
      confidenceScore: clampConfidence((item as { confidenceScore?: unknown; confidence?: unknown }).confidenceScore ?? (item as { confidence?: unknown }).confidence),
      explanation: safeString((item as { explanation?: unknown }).explanation),
      sourceType: 'ai_suggested',
      dismissKey: '',
    };

    if (
      !normalized.personId ||
      !normalized.personName ||
      !normalized.politicalRole ||
      !normalized.politicalOrg ||
      !normalized.boardRole ||
      !normalized.boardOrg ||
      !normalized.description ||
      !normalized.explanation
    ) {
      continue;
    }

    normalized.dismissKey = buildDismissKey(normalized);
    parsed.push(normalized);
  }

  const deduped = new Map<string, AiDetectedConflict>();
  for (const conflict of parsed) {
    if (!deduped.has(conflict.dismissKey)) {
      deduped.set(conflict.dismissKey, conflict);
    }
  }

  return Array.from(deduped.values());
}

export async function detectAiConflicts(): Promise<AiDetectedConflict[]> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';

  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT.');
  }

  const graphData = getPoliticalData();
  const timelines = getAllTimelines();
  const curatedConflicts = getAllConflicts();

  const url = `${endpoint.replace(/\/+$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const systemPrompt = [
    'You detect potential conflicts of interest in Norwegian political network data.',
    'Return ONLY valid JSON matching this shape: {"conflicts":[...]}',
    'Each conflict object must include:',
    'personId, personName, politicalRole, politicalOrg, boardRole, boardOrg, sector, conflictType, description, severity, classification, confidenceScore, explanation.',
    'Allowed conflictType: revolving_door, concurrent, sector_overlap, shared_network.',
    'Allowed severity: critical, high, medium, low.',
    'Allowed classification:',
    'A = Direct personal financial gain from political decisions',
    'B = Revolving door between regulator and regulated',
    'C = Network/friendship-based influence',
    'D = Structural overlap without clear personal gain',
    'confidenceScore must be a number from 0 to 1.',
    'Use concise factual explanations grounded in the provided data only.',
  ].join('\n');

  const userPrompt = JSON.stringify(
    {
      task: 'Detect potential new conflicts of interest. Focus on patterns: revolving door, overlapping interests, procurement influence.',
      data: {
        graphData,
        timelines,
        curatedConflicts,
      },
    },
    null,
    2,
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure OpenAI request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as AzureChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    return [];
  }

  return toAiDetectedConflicts(parsedContent);
}

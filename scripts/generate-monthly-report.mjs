import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { NEWS_SOURCE_CATEGORIES } from '../src/data/newsSources.ts';
import { SNAPSHOT_INDICATORS } from '../src/data/snapshotIndicators.ts';
import {
  CATEGORY_LIMITS, REPORTS_DIR, RETENTION_DAYS, amsterdamDate, dayDifference,
  hostnameMatches, latestReport, reportWindow, writeReport
} from './report-lib.mjs';

const requestedDate = process.argv.find((arg) => arg.startsWith('--report-date='))?.split('=')[1];
const reportDate = requestedDate ?? amsterdamDate();
const window = reportWindow(reportDate);
const outputName = `${reportDate}.md`;
const outputPath = path.join(REPORTS_DIR, outputName);
const previous = await latestReport(outputName);
const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const MAX_API_ATTEMPTS = 6;
const RETRYABLE_429_CODES = new Set(['rate_limit_exceeded', 'slow_down']);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(error, attempt) {
  const retryAfter = error?.headers?.get?.('retry-after');
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return (seconds * 1000) + 1000;
  if (retryAfter) {
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now()) + 1000;
  }
  const messageDelay = String(error?.message ?? '').match(/try again in\s+([\d.]+)s/i);
  if (messageDelay) return (Number(messageDelay[1]) * 1000) + 1000;
  return Math.min(5000 * (2 ** (attempt - 1)), 60000) + Math.floor(Math.random() * 1000);
}

function isTemporaryAPIError(error) {
  if (error?.status === 503) return true;
  return error?.status === 429 && (
    RETRYABLE_429_CODES.has(error?.code) ||
    error?.type === 'tokens' ||
    error?.type === 'rate_limit_error'
  );
}

async function withTemporaryRetry(label, operation) {
  for (let attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTemporaryAPIError(error) || attempt === MAX_API_ATTEMPTS) throw error;
      const delay = retryDelay(error, attempt);
      console.warn(`${label} temporarily limited; retrying attempt ${attempt + 1}/${MAX_API_ATTEMPTS} in ${(delay / 1000).toFixed(1)}s.`);
      await sleep(delay);
    }
  }
  throw new Error(`${label} exhausted its retry attempts.`);
}

function deriveMidLevelRoleShare(metricsById) {
  if (metricsById.has('mid_level_role_share')) return;
  const roles = metricsById.get('mid_level_roles');
  const total = metricsById.get('open_roles');
  if (!roles || !total || roles.source !== total.source || roles.observed_on !== total.observed_on || total.value <= 0) return;
  const value = Number(((roles.value / total.value) * 100).toFixed(1));
  metricsById.set('mid_level_role_share', {
    id: 'mid_level_role_share',
    label: 'Mid-level role share',
    value,
    display_value: `${value.toFixed(1)}%`,
    detail: `${roles.display_value} of ${total.display_value} tracked openings`,
    scope: roles.scope,
    unit: 'percent of tracked openings',
    category: 'Employment',
    kind: 'Calculated',
    observed_on: roles.observed_on,
    ...(roles.period_start ? { period_start: roles.period_start } : {}),
    ...(roles.period_end ? { period_end: roles.period_end } : {}),
    ...(roles.published_on || total.published_on ? {
      published_on: [roles.published_on, total.published_on].filter(Boolean).sort().at(-1)
    } : {}),
    source: roles.source,
    ...(roles.source_url || total.source_url ? { source_url: roles.source_url ?? total.source_url } : {}),
    origin: 'Calculated from stored job-listing counts',
    source_relationship: 'Derived from',
    calculation: 'mid-level roles / tracked open roles x 100',
    inputs: [
      { label: roles.label, value: roles.value, display_value: roles.display_value },
      { label: total.label, value: total.value, display_value: total.display_value }
    ],
    collected_on: reportDate,
    carried_forward: Boolean(roles.carried_forward && total.carried_forward)
  });
}

function githubOIDCProvider(requestURL, requestToken, audience) {
  return {
    tokenType: 'jwt',
    getToken: async () => {
      const url = new URL(requestURL);
      url.searchParams.set('audience', audience);
      const response = await fetch(url, { headers: { Authorization: `bearer ${requestToken}` } });
      if (!response.ok) throw new Error(`GitHub OIDC token request failed: ${response.status}`);
      const data = await response.json();
      if (!data.value) throw new Error('GitHub OIDC response did not contain a token.');
      return data.value;
    }
  };
}

function openAIClient() {
  const identityProviderId = process.env.OPENAI_IDENTITY_PROVIDER_ID;
  const serviceAccountId = process.env.OPENAI_SERVICE_ACCOUNT_ID;
  const audience = process.env.OPENAI_WIF_AUDIENCE;
  const requestURL = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (identityProviderId && serviceAccountId && audience && requestURL && requestToken) {
    return new OpenAI({ maxRetries: 0, workloadIdentity: {
      identityProviderId,
      serviceAccountId,
      provider: githubOIDCProvider(requestURL, requestToken, audience)
    }});
  }
  if (process.env.OPENAI_API_KEY) return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });
  throw new Error('Configure OpenAI workload identity variables or OPENAI_API_KEY.');
}

const client = openAIClient();
console.log(`Generating ${reportDate} for ${window.periodStart} through ${window.periodEnd} with ${model}.`);
console.log(`Authentication: ${process.env.OPENAI_IDENTITY_PROVIDER_ID ? 'OpenAI workload identity' : 'API key fallback'}.`);
const snapshotTargets = SNAPSHOT_INDICATORS
  .map(({ key, label }) => `- ${key}: ${label}`)
  .join('\n');
const previousBySource = new Map();
for (const metric of previous.data.metrics ?? []) {
  const list = previousBySource.get(metric.source) ?? [];
  list.push(metric);
  previousBySource.set(metric.source, list);
}

const observationSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    observations: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^[a-z0-9_]+$' },
          label: { type: 'string' }, value: { type: 'number' }, display_value: { type: 'string' },
          detail: { type: 'string' }, scope: { type: 'string' }, unit: { type: ['string', 'null'] },
          category: { type: 'string', enum: ['Market', 'Players', 'Employment', 'Business', 'Corporate', 'Products'] },
          kind: { type: 'string', enum: ['Reported', 'Forecast', 'Estimate'] },
          observed_on: { type: 'string' }, period_start: { type: ['string', 'null'] },
          period_end: { type: ['string', 'null'] }, published_on: { type: 'string' },
          source: { type: 'string' }, origin: { type: ['string', 'null'] },
          source_relationship: { type: ['string', 'null'], enum: ['Original source', 'Repeats / cites', 'First-party', 'Owned by', 'Funded by', 'Independent reporting', 'Unknown', null] },
          source_url: { type: 'string' }, evidence_excerpt: { type: 'string' }
        },
        required: ['id','label','value','display_value','detail','scope','unit','category','kind','observed_on','period_start','period_end','published_on','source','origin','source_relationship','source_url','evidence_excerpt']
      }
    }
  }, required: ['observations']
};

async function collectCategory(group) {
  const sources = group.sources.map((source) => ({
    name: source.name, canonical_url: source.url, coverage: source.coverage,
    language: source.language, previous_metrics: previousBySource.get(source.name) ?? []
  }));
  const response = await withTemporaryRetry(`Source group "${group.name}"`, () => client.responses.create({
    model,
    reasoning: { effort: 'low' },
    tools: [{ type: 'web_search', search_context_size: 'low' }],
    text: { format: { type: 'json_schema', name: 'monthly_observations', strict: true, schema: observationSchema } },
    input: `Find newly published, numeric games-industry observations for this reporting window: ${window.periodStart} through ${window.periodEnd}, inclusive.\n\nOnly use the registered sources below, preferably their first-party pages. Return an empty array when nothing verifiable is available. Every observation must be explicitly supported by the exact evidence URL and a short excerpt containing the value. Never calculate, infer, combine, extrapolate, or copy a claim from an unrelated secondary domain. published_on must fall inside the reporting window. observed_on is the date or period end the number describes and must not be changed to the collection date. Reuse a previous metric id when the scope and measure are genuinely the same; otherwise create a stable id without dates or quarter names. Keep incompatible scopes separate. Do not return narrative news without a numeric observation.\n\nPrioritize direct observations for these dashboard indicators. Use the exact id before the colon when an observation matches. These indicators must describe the overall market or a multi-company workforce dataset, never one company, developer, publisher or game:\n${snapshotTargets}\n\nRegistered ${group.name} sources:\n${JSON.stringify(sources)}`
  }));
  return JSON.parse(response.output_text).observations;
}

const collected = [];
for (const group of NEWS_SOURCE_CATEGORIES) {
  let observations;
  try {
    observations = await collectCategory(group);
  } catch (error) {
    const status = error?.status ? ` (HTTP ${error.status})` : '';
    const code = error?.code ? ` [${error.code}]` : '';
    throw new Error(`Collection failed for source group "${group.name}"${status}${code}: ${error?.message ?? error}`, { cause: error });
  }
  for (const metric of observations) {
    const source = group.sources.find((candidate) => candidate.name === metric.source);
    if (!source) continue;
    if (metric.published_on < window.periodStart || metric.published_on > window.periodEnd) continue;
    if (!hostnameMatches(metric.source_url, source.url)) continue;
    if (metric.evidence_excerpt.trim().split(/\s+/).length > 25) continue;
    collected.push({
      ...Object.fromEntries(Object.entries(metric).filter(([, value]) => value !== null)),
      collected_on: reportDate,
      carried_forward: false
    });
  }
}

const previousSnapshotMetricIds = new Set(Object.values(previous.data.snapshot ?? {}));
const snapshotCandidateMetricIds = new Set(SNAPSHOT_INDICATORS.flatMap((indicator) => indicator.metricIds));
const retained = (previous.data.metrics ?? [])
  .filter((metric) => previousSnapshotMetricIds.has(metric.id)
    || snapshotCandidateMetricIds.has(metric.id)
    || dayDifference(window.periodEnd, String(metric.observed_on).slice(0, 10)) <= RETENTION_DAYS[metric.category])
  .map(({ featured: _featured, ...metric }) => ({ ...metric, carried_forward: true }));
const byId = new Map(retained.map((metric) => [metric.id, metric]));
for (const metric of collected) {
  const existing = byId.get(metric.id);
  if (!existing || String(metric.observed_on).localeCompare(String(existing.observed_on)) >= 0) {
    byId.set(metric.id, metric);
  }
}
deriveMidLevelRoleShare(byId);

const snapshotEntries = SNAPSHOT_INDICATORS.map((indicator) => {
  const metric = [...byId.values()]
    .filter((candidate) => indicator.metricIds.includes(candidate.id))
    .sort((a, b) => String(b.observed_on).localeCompare(String(a.observed_on)))[0];
  return [indicator.key, metric?.id];
});
const missingIndicators = snapshotEntries.filter(([, metricId]) => !metricId).map(([key]) => key);
if (missingIndicators.length) {
  console.warn(`Snapshot indicators without recorded data will be omitted: ${missingIndicators.join(', ')}`);
}
const snapshot = Object.fromEntries(snapshotEntries.filter(([, metricId]) => metricId));
const snapshotMetricIds = new Set(Object.values(snapshot));

const categoryOrder = Object.keys(CATEGORY_LIMITS);
const metrics = categoryOrder.flatMap((category) => {
  const candidates = [...byId.values()]
    .filter((metric) => metric.category === category)
    .sort((a, b) => String(b.observed_on).localeCompare(String(a.observed_on)));
  const dashboardMetrics = candidates.filter((metric) => snapshotMetricIds.has(metric.id));
  const supportingMetrics = candidates.filter((metric) => !snapshotMetricIds.has(metric.id));
  return [...dashboardMetrics, ...supportingMetrics].slice(0, Math.max(CATEGORY_LIMITS[category], dashboardMetrics.length));
});

if (metrics.length < 12) throw new Error(`Only ${metrics.length} valid observations remain; refusing to publish.`);

const summaryResponse = await withTemporaryRetry('Report summary', () => client.responses.create({
  model,
  reasoning: { effort: 'low' },
  text: { format: { type: 'json_schema', name: 'report_copy', strict: true, schema: {
    type: 'object', additionalProperties: false,
    properties: { lede: { type: 'string' }, body_markdown: { type: 'string' } },
    required: ['lede', 'body_markdown']
  }}},
  input: `Write the public copy for a monthly games-industry data snapshot using only the observations below. The lede must be one factual sentence about industry-wide indicators and must not spotlight one company, developer, publisher or game. The body must be 400-500 words in compact paragraphs, easy to digest, and explain what the figures collectively show while keeping incompatible scopes separate. Include useful numbers. Do not mention AI, automation, methodology, confidence scoring, instructions, notes to self, or the collection process. Do not introduce any fact that is not present in the observations. Do not use headings or bullet points. Clearly distinguish reported figures, estimates and forecasts.\n\nObservations:\n${JSON.stringify(metrics)}`
}));
const copy = JSON.parse(summaryResponse.output_text);

const report = {
  title: 'Game Industry Data Snapshot',
  published: reportDate,
  period_start: window.periodStart,
  period_end: window.periodEnd,
  ai_generated: true,
  human_reviewed: false,
  geographic_scope: previous.data.geographic_scope,
  global_representativeness: previous.data.global_representativeness,
  independently_audited: false,
  summary: copy.lede,
  snapshot,
  metrics
};
await fs.writeFile(outputPath, writeReport(report, copy.body_markdown), 'utf8');
console.log(`Wrote ${outputPath} with ${collected.length} new and ${metrics.length - collected.length} retained observations.`);

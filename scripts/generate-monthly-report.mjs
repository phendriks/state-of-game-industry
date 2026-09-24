import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { NEWS_SOURCE_CATEGORIES } from '../src/data/newsSources.ts';
import { SNAPSHOT_INDICATORS } from '../src/data/snapshotIndicators.ts';
import { STATISTICAL_SOURCES } from '../src/data/statisticalSources.ts';
import { TALENT_SNAPSHOT_INDICATORS } from '../src/data/talentIndicators.ts';
import { DASHBOARD_METRIC_IDS } from '../src/data/dashboardMetrics.ts';
import { REPORT_MODEL_CONFIG } from '../src/data/reportConfig.ts';
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
const model = process.env.OPENAI_MODEL || REPORT_MODEL_CONFIG.defaultModel;
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
const previousSnapshotMetricIds = new Set(Object.values(previous.data.snapshot ?? {}));
const snapshotCandidateMetricIds = new Set(SNAPSHOT_INDICATORS.flatMap((indicator) => indicator.metricIds));
const dashboardMetricIds = new Set(DASHBOARD_METRIC_IDS);
const retained = (previous.data.metrics ?? [])
  .filter((metric) => previousSnapshotMetricIds.has(metric.id)
    || snapshotCandidateMetricIds.has(metric.id)
    || dashboardMetricIds.has(metric.id)
    || dayDifference(window.periodEnd, String(metric.observed_on).slice(0, 10)) <= RETENTION_DAYS[metric.category])
  .map(({ featured: _featured, ...metric }) => ({ ...metric, carried_forward: true }));

const observationItemSchema = {
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
};

const statisticalObservationItemSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9_]+$' },
    label: { type: 'string' }, display_value: { type: 'string' }, detail: { type: 'string' },
    source_id: { type: 'string' }, publisher: { type: 'string' }, dataset_name: { type: 'string' },
    dataset_id: { type: ['string', 'null'] }, table_id: { type: ['string', 'null'] }, source_url: { type: 'string' },
    geography: { type: 'string' }, reference_period: { type: 'string' }, observed_on: { type: 'string' },
    release_date: { type: ['string', 'null'] }, revision_status: { type: 'string', enum: ['provisional', 'revised', 'final', 'unknown'] },
    classification_system: { type: ['string', 'null'] }, classification_version: { type: ['string', 'null'] }, classification_code: { type: ['string', 'null'] },
    measure: { type: 'string', enum: ['game_program_entrants', 'annual_game_specific_graduates', 'workforce_contraction', 'industry_inflow', 'industry_outflow'] },
    original_unit: { type: 'string' }, original_value: { type: 'number' },
    query_or_filters: { type: ['string', 'null'] }, transformation: { type: ['string', 'null'] }, derived_value: { type: ['number', 'null'] },
    precision_class: { type: 'string', enum: ['game-specific', 'identified-games-workforce'] },
    coverage_notes: { type: 'string' }, evidence_excerpt: { type: 'string' }, raw_file_hash: { type: ['string', 'null'] }
  },
  required: ['id','label','display_value','detail','source_id','publisher','dataset_name','dataset_id','table_id','source_url','geography','reference_period','observed_on','release_date','revision_status','classification_system','classification_version','classification_code','measure','original_unit','original_value','query_or_filters','transformation','derived_value','precision_class','coverage_notes','evidence_excerpt','raw_file_hash']
};

const monthlyReportSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    observations: { type: 'array', maxItems: 32, items: observationItemSchema },
    statistical_observations: { type: 'array', maxItems: 8, items: statisticalObservationItemSchema },
    lede: { type: 'string' },
    body_markdown: { type: 'string' }
  },
  required: ['observations', 'statistical_observations', 'lede', 'body_markdown']
};

const newsSources = NEWS_SOURCE_CATEGORIES.map((group) => ({
  category: group.name,
  sources: group.sources.map((source) => ({
    name: source.name,
    canonical_url: source.url,
    coverage: source.coverage,
    language: source.language
  }))
}));
const statisticalSources = STATISTICAL_SOURCES
  .filter((source) => source.active && ['education-pipeline', 'workforce-flow', 'industry-workforce'].includes(source.category))
  .map((source) => ({
    id: source.id,
    name: source.name,
    publisher: source.publisher,
    canonical_url: source.url,
    geography: source.geography,
    classification_system: source.classificationSystem,
    role: source.role,
    limitations: source.limitations
  }));

let generated;
try {
  const response = await withTemporaryRetry('Monthly report', () => client.responses.create({
    model,
    reasoning: { effort: REPORT_MODEL_CONFIG.reasoningEffort },
    tools: [{ type: 'web_search', search_context_size: 'low' }],
    text: { format: { type: 'json_schema', name: 'monthly_report', strict: true, schema: monthlyReportSchema } },
    input: `Create one monthly games-industry report for ${window.periodStart} through ${window.periodEnd}, inclusive. Complete collection and report writing in this single response.

REGULAR OBSERVATIONS
Find newly published numeric observations using only the registered news sources below. Return an empty observations array when nothing is verifiable. Each observation requires the exact evidence URL and an excerpt of at most 25 words containing the value. Never infer, combine or extrapolate. published_on must fall inside the reporting window. observed_on is the date or period end described by the value. Reuse an id from the retained observations only when scope and measure genuinely match; otherwise use a stable id without dates or quarter names. Keep incompatible scopes separate.

Prioritize these dashboard indicators, which must describe the overall market or a multi-company workforce dataset rather than one company, developer, publisher or game:
${snapshotTargets}
Also refresh these stable dashboard observations when the registered sources publish compatible data: ${DASHBOARD_METRIC_IDS.join(', ')}. Preserve their stated scope and never replace them with a single-company figure.

TALENT OBSERVATIONS
In the same report, find the latest official observation available on or before ${window.periodEnd} for game_program_entrants, annual_game_specific_graduates, workforce_contraction, industry_inflow and industry_outflow. Education results require an official programme or classification explicitly naming games or game development and precision_class game-specific. Never include adjacent computer science, animation, VFX, interactive media or art programmes. Workforce results require precision_class identified-games-workforce. Never substitute broader sectors, layoffs, employer separations, intent-to-leave sentiment or general labour proxies. Return unavailable measures as no observation. Do not combine countries, sources or classifications. Preserve the original value, unit, period, release, classification and filters. source_url must be official, evidence_excerpt must contain the value in at most 25 words, and raw_file_hash must be null.

REPORT COPY
Write one factual lede and a readable body in compact paragraphs. Use the length needed to explain the available observations clearly without padding or repetition. Use only the retained observations and observations returned in this response. Explain what the figures collectively show while keeping incompatible scopes separate. Include useful numbers and distinguish reported figures, estimates and forecasts. Do not mention AI, automation, methodology, confidence scores, instructions, notes to self or the collection process. Do not use headings or bullet points. Do not spotlight one company, developer, publisher or game in the lede.

Retained observations:
${JSON.stringify(retained)}

Registered news sources:
${JSON.stringify(newsSources)}

Registered statistical sources:
${JSON.stringify(statisticalSources)}`
  }));
  generated = JSON.parse(response.output_text);
} catch (error) {
  const status = error?.status ? ` (HTTP ${error.status})` : '';
  const code = error?.code ? ` [${error.code}]` : '';
  throw new Error(`Monthly report generation failed${status}${code}: ${error?.message ?? error}`, { cause: error });
}

const collected = [];
for (const metric of generated.observations) {
  const source = NEWS_SOURCE_CATEGORIES.flatMap((group) => group.sources).find((candidate) => candidate.name === metric.source);
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

const statisticalCollected = [];
for (const observation of generated.statistical_observations) {
  const source = STATISTICAL_SOURCES.find((candidate) => candidate.id === observation.source_id);
  if (!source || !hostnameMatches(observation.source_url, source.url)) continue;
  if (observation.release_date && observation.release_date > window.periodEnd) continue;
  if (observation.observed_on > window.periodEnd) continue;
  if (observation.evidence_excerpt.trim().split(/\s+/).length > 25) continue;
  const indicator = TALENT_SNAPSHOT_INDICATORS.find((candidate) => candidate.measure === observation.measure);
  if (!indicator || indicator.precision !== observation.precision_class) continue;
  statisticalCollected.push({
    ...Object.fromEntries(Object.entries(observation).filter(([, value]) => value !== null)),
    publisher: source.publisher,
    retrieved_at: reportDate,
    methodology_version: 'talent-v1',
    carried_forward: false
  });
}
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

const statisticalById = new Map(
  (previous.data.statistical_observations ?? []).map((observation) => [observation.id, { ...observation, carried_forward: true }])
);
for (const observation of statisticalCollected) {
  const existing = statisticalById.get(observation.id);
  if (!existing || String(observation.observed_on).localeCompare(String(existing.observed_on)) >= 0) {
    statisticalById.set(observation.id, observation);
  }
}
const statisticalObservations = [...statisticalById.values()];
const selectedTalent = new Map(TALENT_SNAPSHOT_INDICATORS.map((indicator) => {
  const observation = statisticalObservations
    .filter((candidate) => candidate.measure === indicator.measure && candidate.precision_class === indicator.precision)
    .sort((a, b) => String(b.observed_on).localeCompare(String(a.observed_on)))[0];
  return [indicator.key, observation];
}));
const talentPipeline = {};
const entrants = selectedTalent.get('entrants');
const graduates = selectedTalent.get('graduate_supply');
if (entrants) talentPipeline.entrants = { observation_ids: [entrants.id] };
if (graduates) talentPipeline.graduate_supply = { observation_ids: [graduates.id] };
const workforceFlow = {};
const contraction = selectedTalent.get('workforce_contraction');
const inflow = selectedTalent.get('industry_inflow');
const outflow = selectedTalent.get('industry_outflow');
if (contraction) workforceFlow.workforce_contraction = { observation_ids: [contraction.id] };
if (inflow) workforceFlow.industry_inflow = { observation_ids: [inflow.id] };
if (outflow) workforceFlow.industry_outflow = { observation_ids: [outflow.id] };
if (Object.keys(workforceFlow).length) talentPipeline.workforce_flow = workforceFlow;

const categoryOrder = Object.keys(CATEGORY_LIMITS);
const metrics = categoryOrder.flatMap((category) => {
  const candidates = [...byId.values()]
    .filter((metric) => metric.category === category)
    .sort((a, b) => String(b.observed_on).localeCompare(String(a.observed_on)));
  const dashboardMetrics = candidates.filter((metric) => snapshotMetricIds.has(metric.id) || dashboardMetricIds.has(metric.id));
  const supportingMetrics = candidates.filter((metric) => !snapshotMetricIds.has(metric.id) && !dashboardMetricIds.has(metric.id));
  return [...dashboardMetrics, ...supportingMetrics].slice(0, Math.max(CATEGORY_LIMITS[category], dashboardMetrics.length));
});

const copy = { lede: generated.lede, body_markdown: generated.body_markdown };

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
  metrics,
  ...(statisticalObservations.length ? { statistical_observations: statisticalObservations } : {}),
  ...(Object.keys(talentPipeline).length ? { talent_pipeline: talentPipeline } : {})
};
await fs.writeFile(outputPath, writeReport(report, copy.body_markdown), 'utf8');
console.log(`Wrote ${outputPath} with ${collected.length} new report metrics, ${metrics.length - collected.length} retained metrics and ${statisticalCollected.length} new talent observations.`);

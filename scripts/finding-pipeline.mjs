import fs from 'node:fs/promises';
import path from 'node:path';
import { candidateFindingCollectionSchemaV1, challengedFindingCollectionSchemaV1 } from '../src/data/evidence/schema-v1.ts';
import { REPORT_MODEL_CONFIG } from '../src/data/reportConfig.ts';
import { pipelineOpenAIClient } from './pipeline-openai.mjs';
import { readRunManifest, RUNS_DIR, RUN_STAGE_FILES, writeRunStage } from './run-workspace.mjs';
import { readSourceDiscovery } from './source-acquisition.mjs';
import { hostnameMatches } from './report-lib.mjs';

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const readJsonl = async (file) => (await fs.readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const directory = (root, runId) => path.join(path.resolve(root), runId);

const candidateApiSchema = { type: 'object', additionalProperties: false, properties: { candidates: { type: 'array', maxItems: 20, items: {
  type: 'object', additionalProperties: false, properties: {
    finding_id: { type: 'string', pattern: '^[a-z0-9][a-z0-9._:-]*$' }, finding_type: { type: 'string', enum: ['conflict','confusion','alignment','correction'] },
    title: { type: 'string' }, statement: { type: 'string' }, observation_ids: { type: 'array', minItems: 1, items: { type: 'string' } },
    event_ids: { type: 'array', items: { type: 'string' } }, metric_ids: { type: 'array', items: { type: 'string' } }, why_notable: { type: 'string' }
  }, required: ['finding_id','finding_type','title','statement','observation_ids','event_ids','metric_ids','why_notable']
} } }, required: ['candidates'] };

const reviewApiSchema = { type: 'object', additionalProperties: false, properties: { reviews: { type: 'array', items: {
  type: 'object', additionalProperties: false, properties: {
    finding_id: { type: 'string' }, final_statement: { type: 'string' }, challenges_checked: { type: 'array', minItems: 1, items: { type: 'string' } },
    counter_evidence: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      claim: { type: 'string' }, source_id: { type: 'string' }, source_url: { type: 'string' }, underlying_source_id: { type: ['string','null'] },
      evidence_type: { type: 'string', enum: ['reported','observed','estimated','forecast','derived','survey','proxy'] }, geography: { type: 'string' },
      reference_period_start: { type: 'string' }, reference_period_end: { type: 'string' }
    }, required: ['claim','source_id','source_url','underlying_source_id','evidence_type','geography','reference_period_start','reference_period_end'] } },
    status: { type: 'string', enum: ['confirmed','qualified','resolved','rejected','insufficient_evidence'] }, decision_reason: { type: 'string' }
  }, required: ['finding_id','final_statement','challenges_checked','counter_evidence','status','decision_reason']
} } }, required: ['reviews'] };

export async function generateCandidateFindings(runId, client = pipelineOpenAIClient(), root = RUNS_DIR) {
  const manifest = await readRunManifest(runId, root);
  if (manifest.stages.normalized !== 'written' || manifest.stages['derived-metrics'] !== 'written') throw new Error('Candidate generation requires written normalized observations and derived metrics.');
  const base = directory(root, runId);
  const observations = await readJsonl(path.join(base, RUN_STAGE_FILES.normalized));
  const events = await readJsonl(path.join(base, RUN_STAGE_FILES.events));
  const derived = await readJson(path.join(base, RUN_STAGE_FILES['derived-metrics']));
  if (!observations.length) {
    await writeRunStage(runId, 'candidate-findings', [], root);
    return [];
  }
  const response = await client.responses.create({ model: REPORT_MODEL_CONFIG.defaultModel, reasoning: { effort: REPORT_MODEL_CONFIG.reasoningEffort },
    text: { format: { type: 'json_schema', name: 'candidate_findings', strict: true, schema: candidateApiSchema } },
    input: `Generate up to 20 distinct candidate games-industry findings from only the supplied evidence. Return fewer, or an empty list, when the evidence does not support more. Allow conflict, confusion, alignment and correction. Do not prefer drama. Do not invent facts or calculate new metrics. Every statement must cite supplied observation, event or metric IDs. These are candidates, not publishable conclusions.\nObservations: ${JSON.stringify(observations)}\nEvents: ${JSON.stringify(events)}\nDerived metrics: ${JSON.stringify(derived)}` });
  const parsed = JSON.parse(response.output_text);
  const candidates = candidateFindingCollectionSchemaV1.parse(parsed.candidates.map((candidate) => ({ ...candidate, schema_version: manifest.schema_version, methodology_version: 'findings-v1', run_id: runId, status: 'candidate' })));
  const observationIds = new Set(observations.map((item) => item.observation_id)); const eventIds = new Set(events.map((item) => item.event_id)); const metricIds = new Set((derived.metrics ?? []).map((item) => item.id));
  for (const finding of candidates) {
    for (const id of finding.observation_ids) if (!observationIds.has(id)) throw new Error(`Finding ${finding.finding_id} references unknown observation ${id}.`);
    for (const id of finding.event_ids) if (!eventIds.has(id)) throw new Error(`Finding ${finding.finding_id} references unknown event ${id}.`);
    for (const id of finding.metric_ids) if (!metricIds.has(id)) throw new Error(`Finding ${finding.finding_id} references unknown metric ${id}.`);
  }
  await writeRunStage(runId, 'candidate-findings', candidates, root);
  return candidates;
}

export async function challengeCandidateFindings(runId, client = pipelineOpenAIClient(), root = RUNS_DIR) {
  const manifest = await readRunManifest(runId, root); const base = directory(root, runId);
  if (manifest.stages['candidate-findings'] !== 'written') throw new Error('Adversarial review requires written candidate findings.');
  const candidates = candidateFindingCollectionSchemaV1.parse(await readJson(path.join(base, RUN_STAGE_FILES['candidate-findings'])));
  if (!candidates.length) {
    await writeRunStage(runId, 'validated-findings', [], root);
    await writeRunStage(runId, 'rejected-findings', [], root);
    return { validated: [], rejected: [] };
  }
  const observations = await readJsonl(path.join(base, RUN_STAGE_FILES.normalized));
  const events = await readJsonl(path.join(base, RUN_STAGE_FILES.events));
  const derived = await readJson(path.join(base, RUN_STAGE_FILES['derived-metrics']));
  const discovery = await readSourceDiscovery(runId, root);
  const approvedSources = [...discovery.registry_sources, ...discovery.candidates.filter((item) => item.decision === 'accepted').map((item) => ({ source_id: item.candidate_id, canonical_url: item.canonical_url }))];
  const response = await client.responses.create({ model: REPORT_MODEL_CONFIG.defaultModel, reasoning: { effort: REPORT_MODEL_CONFIG.reasoningEffort }, tools: [{ type: 'web_search', search_context_size: 'low' }],
    text: { format: { type: 'json_schema', name: 'challenged_findings', strict: true, schema: reviewApiSchema } },
    input: `Adversarially test every candidate. Ask what would make it wrong, incomplete or misleading. Check timing, recurring versus one-time effects, entity scope, geography, confirmation status and alternative explanations. Use only the supplied evidence and approved sources for counter-evidence. Return exactly one review per finding with status confirmed, qualified, resolved, rejected or insufficient_evidence. Do not force disagreement.\nCandidates: ${JSON.stringify(candidates)}\nObservations: ${JSON.stringify(observations)}\nEvents: ${JSON.stringify(events)}\nDerived metrics: ${JSON.stringify(derived)}\nApproved sources: ${JSON.stringify(approvedSources)}` });
  const reviews = JSON.parse(response.output_text).reviews;
  const candidateMap = new Map(candidates.map((item) => [item.finding_id, item]));
  if (reviews.length !== candidates.length || new Set(reviews.map((item) => item.finding_id)).size !== candidates.length) throw new Error('Adversarial review must return exactly one unique result per candidate.');
  const sourceById = new Map(approvedSources.map((source) => [source.source_id, source]));
  const challenged = challengedFindingCollectionSchemaV1.parse(reviews.map((review) => {
    const candidate = candidateMap.get(review.finding_id); if (!candidate) throw new Error(`Review references unknown finding ${review.finding_id}.`);
    for (const evidence of review.counter_evidence) {
      const source = sourceById.get(evidence.source_id);
      if (!source) throw new Error(`Review ${review.finding_id} uses unapproved source ${evidence.source_id}.`);
      if (!hostnameMatches(evidence.source_url, source.canonical_url)) throw new Error(`Review ${review.finding_id} uses a URL outside approved source ${evidence.source_id}.`);
      if (evidence.underlying_source_id && !sourceById.has(evidence.underlying_source_id)) throw new Error(`Review ${review.finding_id} names unapproved underlying source ${evidence.underlying_source_id}.`);
    }
    return { ...review, schema_version: manifest.schema_version, methodology_version: 'adversarial-v1', run_id: runId,
      finding_type: candidate.finding_type, title: candidate.title, original_statement: candidate.statement,
      observation_ids: candidate.observation_ids, event_ids: candidate.event_ids, metric_ids: candidate.metric_ids };
  }));
  const validated = challenged.filter((item) => ['confirmed','qualified','resolved'].includes(item.status));
  const rejected = challenged.filter((item) => ['rejected','insufficient_evidence'].includes(item.status));
  await writeRunStage(runId, 'validated-findings', validated, root);
  await writeRunStage(runId, 'rejected-findings', rejected, root);
  return { validated, rejected };
}

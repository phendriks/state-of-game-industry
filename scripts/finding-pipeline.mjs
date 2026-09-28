import fs from 'node:fs/promises';
import path from 'node:path';
import { candidateFindingCollectionSchemaV1, challengedFindingCollectionSchemaV1, challengedFindingSchemaV1 } from '../src/data/evidence/schema-v1.ts';
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
  const approvedSourceIds = [...new Set(approvedSources.map((source) => source.source_id))];
  const schema = structuredClone(reviewApiSchema);
  const reviewProperties = schema.properties.reviews.items.properties;
  reviewProperties.finding_id.enum = candidates.map((candidate) => candidate.finding_id);
  reviewProperties.counter_evidence.items.properties.source_id.enum = approvedSourceIds;
  reviewProperties.counter_evidence.items.properties.underlying_source_id.enum = [...approvedSourceIds, null];
  const response = await client.responses.create({ model: REPORT_MODEL_CONFIG.defaultModel, reasoning: { effort: REPORT_MODEL_CONFIG.reasoningEffort }, tools: [{ type: 'web_search', search_context_size: 'low' }],
    text: { format: { type: 'json_schema', name: 'challenged_findings', strict: true, schema } },
    input: `Adversarially test every candidate. Ask what would make it wrong, incomplete or misleading. Check timing, recurring versus one-time effects, entity scope, geography, confirmation status and alternative explanations. Use only the supplied evidence and approved sources for counter-evidence. Counter-evidence source_id and underlying_source_id must be source IDs from Approved sources, NEVER observation IDs or finding IDs. source_url must be the exact evidence URL from that approved source. Return empty counter_evidence when no verifiable counter-evidence exists; do not invent a source. Return exactly one review per finding with status confirmed, qualified, resolved, rejected or insufficient_evidence. Do not force disagreement.\nCandidates: ${JSON.stringify(candidates)}\nObservations: ${JSON.stringify(observations)}\nEvents: ${JSON.stringify(events)}\nDerived metrics: ${JSON.stringify(derived)}\nApproved sources: ${JSON.stringify(approvedSources)}` });
  let originalReviews = null;
  let responseWarning = null;
  try { originalReviews = JSON.parse(response.output_text)?.reviews; }
  catch { responseWarning = 'Review response is not valid JSON; continuing without reviewed findings.'; }
  if (!Array.isArray(originalReviews) && !responseWarning) responseWarning = 'Review response has no review list; continuing without reviewed findings.';
  const reviews = Array.isArray(originalReviews) ? originalReviews : [];
  const diagnostics = { run_id: runId, original_output_text: response.output_text ?? null, original_reviews: originalReviews ?? null,
    warnings: responseWarning ? [responseWarning] : [], id_corrections: [], excluded_findings: [] };
  if (responseWarning) console.warn(responseWarning);
  const diagnosticsFile = path.join(base, 'finding-review-diagnostics.json');
  await fs.writeFile(diagnosticsFile, `${JSON.stringify(diagnostics, null, 2)}\n`);
  const candidateMap = new Map(candidates.map((item) => [item.finding_id, item]));
  for (const review of reviews) if (!candidateMap.has(review?.finding_id)) {
    const message = `Ignoring review for unknown finding ${review?.finding_id ?? '(missing ID)'}.`;
    diagnostics.warnings.push(message);
    console.warn(message);
  }
  const sourceById = new Map(approvedSources.map((source) => [source.source_id, source]));
  const observationById = new Map(observations.map((observation) => [observation.observation_id, observation]));
  const challenged = challengedFindingCollectionSchemaV1.parse(candidates.map((candidate) => {
    const matches = reviews.filter((review) => review?.finding_id === candidate.finding_id);
    const review = matches.length === 1 ? matches[0] : { finding_id: candidate.finding_id, counter_evidence: [] };
    const issues = [];
    if (matches.length !== 1) issues.push(matches.length ? 'Duplicate reviews for this finding.' : 'No review returned for this finding.');
    if (!Array.isArray(review.counter_evidence)) issues.push('Counter-evidence is missing or malformed.');
    const counterEvidence = (Array.isArray(review.counter_evidence) ? review.counter_evidence : []).map((originalEvidence) => {
      const evidence = { ...originalEvidence };
      // Recover only an unambiguous ID/URL mix-up against an already validated observation.
      const observation = observationById.get(evidence.source_id);
      if (!sourceById.has(evidence.source_id) && observation && evidence.source_url === observation.source_url && sourceById.has(observation.source_id)) {
        diagnostics.id_corrections.push({ finding_id: review.finding_id, original_source_id: evidence.source_id, source_id: observation.source_id, source_url: evidence.source_url });
        console.warn(`Finding ${review.finding_id}: corrected observation/source ID mix-up using its validated evidence URL.`);
        evidence.source_id = observation.source_id;
      }
      const source = sourceById.get(evidence.source_id);
      if (!source) issues.push(`Unapproved source ${evidence.source_id}.`);
      else {
        try {
          if (!hostnameMatches(evidence.source_url, source.canonical_url)) issues.push(`URL is outside approved source ${evidence.source_id}.`);
        } catch { issues.push(`Invalid evidence URL for source ${evidence.source_id}.`); }
      }
      if (evidence.underlying_source_id && !sourceById.has(evidence.underlying_source_id)) issues.push(`Unapproved underlying source ${evidence.underlying_source_id}.`);
      return evidence;
    });
    const context = { schema_version: manifest.schema_version, methodology_version: 'adversarial-v1', run_id: runId,
      finding_id: candidate.finding_id, finding_type: candidate.finding_type, title: candidate.title, original_statement: candidate.statement,
      observation_ids: candidate.observation_ids, event_ids: candidate.event_ids, metric_ids: candidate.metric_ids };
    const parsed = issues.length ? null : challengedFindingSchemaV1.safeParse({ ...review, ...context, counter_evidence: counterEvidence });
    if (parsed && !parsed.success) issues.push(...parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
    if (issues.length) {
      diagnostics.excluded_findings.push({ finding_id: candidate.finding_id, reasons: issues });
      console.warn(`Finding ${candidate.finding_id} excluded from publication: ${issues.join(' ')}`);
      // Do not publish a conclusion after discarding evidence or an incomplete review it might rely on.
      return { ...context, status: 'insufficient_evidence', counter_evidence: [],
        challenges_checked: ['Checked review completeness and source integrity.'],
        final_statement: 'This finding is not publishable because its review could not be verified.',
        decision_reason: `Review integrity warning: ${issues.join(' ')}` };
    }
    return parsed.data;
  }));
  await fs.writeFile(diagnosticsFile, `${JSON.stringify(diagnostics, null, 2)}\n`);
  const validated = challenged.filter((item) => ['confirmed','qualified','resolved'].includes(item.status));
  const rejected = challenged.filter((item) => ['rejected','insufficient_evidence'].includes(item.status));
  await writeRunStage(runId, 'validated-findings', validated, root);
  await writeRunStage(runId, 'rejected-findings', rejected, root);
  return { validated, rejected };
}

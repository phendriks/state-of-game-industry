import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initializeRunWorkspace, writeRunStage } from './run-workspace.mjs';
import { createAcquisitionPlan } from './source-acquisition.mjs';
import { validateAndStoreAtomicObservations } from './observation-extraction.mjs';
import { challengeCandidateFindings, generateCandidateFindings } from './finding-pipeline.mjs';
import { buildDashboardArtifact, calculateDeterministicMetrics, compareAndCheck, selectFindings, validateCompleteRun, writeValidatedReport } from './final-pipeline.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'observatory-findings-'));
const runId = 'run-2026-09-24';
const observation = {
  observation_id: 'newzoo-2026-revenue', entity: 'Global games market', entity_type: 'market', metric: 'games_revenue', value: 213.9, original_value: '$213.9 billion', unit: 'billion_usd',
  reference_period_start: '2026-01-01', reference_period_end: '2026-12-31', observed_at: '2026-09-15T00:00:00Z', retrieved_at: '2026-09-24T08:00:00Z',
  source_id: 'news-newzoo', source_url: 'https://newzoo.com/articles/executive-summary-ggmr-2026-free-edition', underlying_source_id: null, geography: 'Global',
  evidence_type: 'forecast', evidence_class: 'window', confidence: 'high', raw_claim: 'The market is forecast at $213.9 billion.', normalized_claim: 'Global 2026 games revenue forecast is USD 213.9 billion.'
};
const candidatePayload = { candidates: Array.from({ length: 10 }, (_, index) => ({
  finding_id: `candidate-${index + 1}`, finding_type: ['conflict','confusion','alignment','correction'][index % 4], title: `Candidate ${index + 1}`,
  statement: 'The supplied forecast indicates market growth.', observation_ids: [observation.observation_id], event_ids: [], metric_ids: [], why_notable: 'Tests a material market signal.'
})) };
const reviewPayload = { reviews: candidatePayload.candidates.map((candidate, index) => ({
  finding_id: candidate.finding_id, final_statement: index >= 8 ? 'The available evidence does not sustain the original statement.' : 'The forecast supports a qualified growth statement.',
  challenges_checked: ['Checked forecast status, geography and reference period.'], counter_evidence: [],
  status: index === 8 ? 'rejected' : index === 9 ? 'insufficient_evidence' : 'qualified', decision_reason: index >= 8 ? 'Supporting evidence is insufficient.' : 'The statement remains valid when labelled as a forecast.'
})) };
const fakeClient = (payload) => ({ responses: { create: async () => ({ output_text: JSON.stringify(payload) }) } });
const fakeTextClient = (value) => ({ responses: { create: async () => ({ output_text: value }) } });

try {
  await initializeRunWorkspace({ runId, windowStart: '2026-09-10', windowEnd: '2026-09-23', sourceRegistryCommit: 'test', startedAt: '2026-09-24T08:00:00Z' }, root);
  await createAcquisitionPlan(runId, 75, root);
  const stored = await validateAndStoreAtomicObservations(runId, [observation], root);
  await writeRunStage(runId, 'events', [], root);
  await writeRunStage(runId, 'normalized', stored, root);
  await calculateDeterministicMetrics(runId, root);
  const candidates = await generateCandidateFindings(runId, fakeClient(candidatePayload), root);
  assert.equal(candidates.length, 10);
  const evidence = { claim: 'This value is a forecast, not realized revenue.', source_id: observation.source_id,
    source_url: observation.source_url, underlying_source_id: null, evidence_type: 'forecast', geography: 'Global',
    reference_period_start: '2026-01-01', reference_period_end: '2026-12-31' };
  const withEvidence = (change) => {
    const payload = structuredClone(reviewPayload);
    payload.reviews[0].counter_evidence = [{ ...evidence, ...change }];
    return payload;
  };
  const directory = path.join(root, runId);
  const diagnostics = async () => JSON.parse(await fs.readFile(path.join(directory, 'finding-review-diagnostics.json'), 'utf8'));
  // Reproduce the dry-run bug: a validated observation ID was returned as source_id.
  const mixedIds = withEvidence({ source_id: observation.observation_id });
  const recovered = await challengeCandidateFindings(runId, { responses: { create: async (request) => {
    const properties = request.text.format.schema.properties.reviews.items.properties;
    assert.deepEqual(properties.finding_id.enum, candidates.map((candidate) => candidate.finding_id));
    assert.ok(properties.counter_evidence.items.properties.source_id.enum.includes(observation.source_id));
    assert.ok(!properties.counter_evidence.items.properties.source_id.enum.includes(observation.observation_id));
    assert.ok(properties.counter_evidence.items.properties.underlying_source_id.enum.includes(null));
    return { output_text: JSON.stringify(mixedIds) };
  } } }, root);
  assert.equal(recovered.validated.length, 8);
  assert.equal(recovered.validated[0].counter_evidence[0].source_id, observation.source_id);
  assert.equal((await diagnostics()).original_reviews[0].counter_evidence[0].source_id, observation.observation_id);
  assert.equal((await diagnostics()).id_corrections.length, 1);

  for (const change of [
    { source_id: 'unknown-source' },
    { source_url: 'https://unapproved.example/claim' },
    { underlying_source_id: 'unknown-origin' },
    { source_id: observation.observation_id, source_url: 'https://newzoo.com/different-article' },
    { source_url: 'not-a-url' },
    { reference_period_end: '2025-01-01' }
  ]) {
    const continued = await challengeCandidateFindings(runId, fakeClient(withEvidence(change)), root);
    assert.equal(continued.validated.length, 7);
    assert.equal(continued.rejected.length, 3);
    const rejected = continued.rejected.find((review) => review.finding_id === 'candidate-1');
    assert.equal(rejected.status, 'insufficient_evidence');
    assert.deepEqual(rejected.counter_evidence, []);
    assert.ok(!continued.validated.some((review) => review.finding_id === 'candidate-1'));
    assert.equal((await diagnostics()).excluded_findings.length, 1);
  }
  for (const change of ['missing', 'duplicate', 'malformed']) {
    const payload = structuredClone(reviewPayload);
    if (change === 'missing') payload.reviews.shift();
    if (change === 'duplicate') payload.reviews.push(structuredClone(payload.reviews[0]));
    if (change === 'malformed') payload.reviews[0].counter_evidence = null;
    payload.reviews.push({ ...reviewPayload.reviews[0], finding_id: 'not-a-candidate' });
    const continued = await challengeCandidateFindings(runId, fakeClient(payload), root);
    assert.equal(continued.validated.length, 7);
    assert.equal(continued.rejected.length, 3);
    assert.equal((await diagnostics()).warnings.length, 1);
  }
  const emptyReviews = await challengeCandidateFindings(runId, fakeClient({ reviews: [] }), root);
  assert.equal(emptyReviews.validated.length, 0);
  assert.equal(emptyReviews.rejected.length, candidates.length);
  for (const text of ['not JSON', JSON.stringify({ reviews: null })]) {
    const continued = await challengeCandidateFindings(runId, fakeTextClient(text), root);
    assert.equal(continued.validated.length, 0);
    assert.equal(continued.rejected.length, candidates.length);
    assert.equal((await diagnostics()).warnings.length, 1);
    assert.equal((await diagnostics()).original_output_text, text);
  }

  const challenged = await challengeCandidateFindings(runId, fakeClient(reviewPayload), root);
  assert.equal(challenged.validated.length, 8);
  assert.equal(challenged.rejected.length, 2);
  assert.equal((JSON.parse(await fs.readFile(path.join(directory, 'rejected-findings.json'), 'utf8'))).length, 2);
  const selected = await selectFindings(runId, root);
  assert.equal(selected.length, 5);
  await compareAndCheck(runId, null, root);
  const dashboard = await buildDashboardArtifact(runId, root);
  assert.equal(dashboard.fixed.every((card) => card.value !== 0 || card.status !== 'data not found'), true);
  const report = `# Headline thesis\n\n${selected.map((finding) => `<!-- finding:${finding.finding_id} -->\n## ${finding.title}\n\n${finding.final_statement}`).join('\n\n')}\n\n## What changed\n\nNo previous run.\n\n<details><summary>Evidence / methodology</summary>Validated evidence only.</details>`;
  await writeValidatedReport(runId, fakeTextClient(report), root);
  assert.equal((await validateCompleteRun(runId, root)).status, 'passed');
  console.log('Candidate generation and adversarial review tests passed.');
} finally { await fs.rm(root, { recursive: true, force: true }); }

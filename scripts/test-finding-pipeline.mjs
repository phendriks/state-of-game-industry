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
  const challenged = await challengeCandidateFindings(runId, fakeClient(reviewPayload), root);
  assert.equal(challenged.validated.length, 8);
  assert.equal(challenged.rejected.length, 2);
  const directory = path.join(root, runId);
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

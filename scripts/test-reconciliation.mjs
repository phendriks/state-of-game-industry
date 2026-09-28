import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initializeRunWorkspace } from './run-workspace.mjs';
import { createAcquisitionPlan } from './source-acquisition.mjs';
import { validateAndStoreAtomicObservations } from './observation-extraction.mjs';
import { loadEntityRegistry, reconcileEventCandidates, reconcileJobs } from './reconciliation.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'observatory-reconciliation-'));
const runId = 'run-2026-09-24';
const baseObservation = {
  entity: 'Ubisoft Entertainment', entity_type: 'company', metric: 'roles_at_risk', value: 380, original_value: '380 roles', unit: 'people',
  reference_period_start: '2026-09-12', reference_period_end: '2026-09-12', observed_at: '2026-09-12T00:00:00Z', retrieved_at: '2026-09-20T08:00:00Z',
  source_id: 'news-ubisoft-investor-center', source_url: 'https://www.ubisoft.com/en-us/company/about-us/investors', underlying_source_id: null,
  geography: 'France', evidence_type: 'reported', evidence_class: 'window', confidence: 'high', raw_claim: 'Ubisoft reported 380 roles at risk.', normalized_claim: 'Ubisoft reported 380 roles at risk.'
};
try {
  await initializeRunWorkspace({ runId, windowStart: '2026-09-10', windowEnd: '2026-09-23', sourceRegistryCommit: 'test', startedAt: '2026-09-24T08:00:00Z' }, root);
  await createAcquisitionPlan(runId, 75, root);
  const observations = [
    { ...baseObservation, observation_id: 'ubisoft-layoff-company' },
    { ...baseObservation, observation_id: 'ubisoft-layoff-tracker', source_id: 'news-asgc-layoffs-tracker', source_url: 'https://layoffs.asgc.gg/', underlying_source_id: 'news-ubisoft-investor-center' }
  ];
  await validateAndStoreAtomicObservations(runId, observations, root);
  const candidates = observations.map((observation, index) => ({
    candidate_event_id: `candidate-${index + 1}`, event_type: 'layoff', entity_mentions: [index ? 'Ubisoft' : 'Ubisoft Entertainment'],
    event_start: '2026-09-12', geography: 'France', observation_ids: [observation.observation_id], factual_summary: 'Ubisoft reported roles at risk.'
  }));
  const events = await reconcileEventCandidates(runId, candidates, new Set(observations.map((item) => item.observation_id)), root);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].observation_ids, ['ubisoft-layoff-company', 'ubisoft-layoff-tracker']);
  assert.deepEqual(events[0].entity_ids, ['ubisoft-entertainment']);

  const posting = { company_entity_id: 'ubisoft-entertainment', title: 'Senior Gameplay Programmer', location: 'Paris, France', ats_id: 'job-42', posting_url: 'https://jobs.example.com/job-42', observed_at: '2026-09-20T08:00:00Z' };
  const opened = reconcileJobs([], [posting], '2026-09-20T08:00:00Z');
  const closed = reconcileJobs(opened, [], '2026-09-21T08:00:00Z');
  const reopened = reconcileJobs(closed, [posting], '2026-09-22T08:00:00Z');
  assert.equal(closed[0].closed_at, '2026-09-21T08:00:00Z');
  assert.equal(reopened[0].reopened_at, '2026-09-22T08:00:00Z');
  assert.equal(reopened[0].first_seen, '2026-09-20T08:00:00Z');
  assert.equal((await loadEntityRegistry()).entities.length > 0, true);
  console.log('Entity, event and job reconciliation tests passed.');
} finally { await fs.rm(root, { recursive: true, force: true }); }

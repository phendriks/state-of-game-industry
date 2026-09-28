import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initializeRunWorkspace } from './run-workspace.mjs';
import { activeRegistrySources, addCandidateSource, createAcquisitionPlan, evaluateCandidateSource } from './source-acquisition.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'observatory-acquisition-'));
const runId = 'run-2026-09-24';
try {
  await initializeRunWorkspace({ runId, windowStart: '2026-09-10', windowEnd: '2026-09-23', sourceRegistryCommit: 'test-commit', startedAt: '2026-09-24T08:00:00Z' }, root);
  const registryCount = activeRegistrySources().length;
  const plan = await createAcquisitionPlan(runId, 75, root);
  assert.equal(plan.publication_window.start, '2026-09-10');
  assert.equal(plan.acquisition_window.start, '2026-07-11');
  assert.equal(plan.acquisition_window.days, 75);
  assert.equal(plan.registry_sources.length, registryCount);
  assert.equal(plan.registry_sources.every((source) => source.active), true);
  await assert.rejects(() => createAcquisitionPlan(runId, 59, root), /between 60 and 90/);
  await addCandidateSource(runId, { candidateId: 'candidate-example', name: 'Candidate Example', publisher: 'Example Publisher', canonicalUrl: 'https://example.com/data', geography: 'Japan', neededFor: 'Regional consumer evidence', discoveredAt: '2026-09-20T10:00:00Z' }, root);
  const rejected = await evaluateCandidateSource(runId, 'candidate-example', { decision: 'rejected', reason: 'duplicate', note: 'Repeats an existing registry source.' }, root);
  assert.deepEqual(rejected.rejected_candidates, [{ candidate_id: 'candidate-example', reason: 'duplicate' }]);
  assert.equal(rejected.registry_sources.length, registryCount);
  console.log('Source acquisition tests passed.');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { initializeRunWorkspace } from './run-workspace.mjs';
import { createAcquisitionPlan } from './source-acquisition.mjs';
import { validateAndStoreAtomicObservations } from './observation-extraction.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'observatory-observations-'));
const runId = 'run-2026-09-24';
const observation = {
  observation_id: 'newzoo-2026-revenue', entity: 'Global games market', entity_type: 'market', metric: 'games_revenue', value: 213.9,
  original_value: '$213.9 billion', unit: 'billion_usd', reference_period_start: '2026-01-01', reference_period_end: '2026-12-31',
  observed_at: '2026-09-15T00:00:00Z', retrieved_at: '2026-09-24T08:00:00Z', source_id: 'news-newzoo',
  source_url: 'https://newzoo.com/articles/executive-summary-ggmr-2026-free-edition', underlying_source_id: null,
  geography: 'Global', evidence_type: 'forecast', evidence_class: 'window', confidence: 'high',
  raw_claim: 'The global games market is forecast to generate $213.9 billion in 2026.', normalized_claim: 'Global games revenue forecast for 2026 is USD 213.9 billion.'
};
try {
  await initializeRunWorkspace({ runId, windowStart: '2026-09-10', windowEnd: '2026-09-23', sourceRegistryCommit: 'test', startedAt: '2026-09-24T08:00:00Z' }, root);
  await createAcquisitionPlan(runId, 75, root);
  assert.equal((await validateAndStoreAtomicObservations(runId, [observation], root)).length, 1);
  await assert.rejects(() => validateAndStoreAtomicObservations(runId, [{ ...observation, source_id: 'unknown-source' }], root), /unaccepted source/);
  await assert.rejects(() => validateAndStoreAtomicObservations(runId, [{ ...observation, raw_claim: Array(26).fill('word').join(' ') }], root), /Raw claim/);
  console.log('Atomic observation extraction tests passed.');
} finally { await fs.rm(root, { recursive: true, force: true }); }

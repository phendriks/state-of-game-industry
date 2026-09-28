import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { failRun, initializeRunWorkspace, readRunManifest, RUN_STAGE_FILES, writeRunStage } from './run-workspace.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'observatory-run-workspace-'));
const runId = 'run-2026-09-24';
try {
  const { directory } = await initializeRunWorkspace({ runId, windowStart: '2026-07-01', windowEnd: '2026-09-23', sourceRegistryCommit: 'test-commit', startedAt: '2026-09-24T08:00:00Z' }, root);
  const files = new Set(await fs.readdir(directory));
  assert.equal(files.has('manifest.json'), true);
  Object.values(RUN_STAGE_FILES).forEach((file) => assert.equal(files.has(file), true));
  await assert.rejects(() => initializeRunWorkspace({ runId, windowStart: '2026-07-01', windowEnd: '2026-09-23', sourceRegistryCommit: 'test-commit' }, root));
  await assert.rejects(() => writeRunStage(runId, 'observations', [], root), /source-discovery/);
  await writeRunStage(runId, 'source-discovery', {
    schema_version: '1.0.0', run_id: runId,
    publication_window: { start: '2026-07-01', end: '2026-09-23' },
    acquisition_window: { start: '2026-07-11', end: '2026-09-23', days: 75 },
    evidence_classes: { window: 'Rolling-window evidence.', context: 'Applicable slower-moving evidence.', historical_baseline: 'Previously stored comparison evidence.' },
    registry_sources: [], candidates: [], accepted_candidate_ids: [], rejected_candidates: []
  }, root);
  await writeRunStage(runId, 'observations', [], root);
  const failed = await failRun(runId, 'Deliberate test failure', root, '2026-09-24T08:05:00Z');
  assert.equal(failed.status, 'failed');
  assert.equal((await readRunManifest(runId, root)).failure, 'Deliberate test failure');
  assert.equal((await fs.readdir(directory)).length, Object.keys(RUN_STAGE_FILES).length + 1);
  console.log('Run workspace tests passed.');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

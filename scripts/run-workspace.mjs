import fs from 'node:fs/promises';
import path from 'node:path';
import { candidateFindingCollectionSchemaV1, challengedFindingCollectionSchemaV1, EVIDENCE_SCHEMA_VERSION, eventSchemaV1, observationSchemaV1, runManifestSchemaV1, runStageNames, sourceDiscoverySchemaV1 } from '../src/data/evidence/schema-v1.ts';
import { REPORT_MODEL_CONFIG } from '../src/data/reportConfig.ts';

export const RUNS_DIR = path.resolve('data/runs');
export const RUN_STAGE_FILES = {
  'source-discovery': 'source-discovery.json', observations: 'observations.jsonl', events: 'events.jsonl', normalized: 'normalized.jsonl',
  'derived-metrics': 'derived-metrics.json', 'candidate-findings': 'candidate-findings.json', 'validated-findings': 'validated-findings.json',
  'rejected-findings': 'rejected-findings.json', 'selected-findings': 'selected-findings.json', anomalies: 'anomalies.json', comparison: 'comparison.json',
  dashboard: 'dashboard.json', report: 'report.md', validation: 'validation.json'
};

const emptyStage = (stage, runId) => {
  if (['observations', 'events', 'normalized'].includes(stage)) return '';
  if (stage === 'report') return `# Working report\n\nRun ${runId} has not been validated or published.\n`;
  if (stage === 'source-discovery') return { schema_version: EVIDENCE_SCHEMA_VERSION, run_id: runId, candidates: [], accepted: [], rejected: [] };
  if (stage === 'derived-metrics') return { schema_version: EVIDENCE_SCHEMA_VERSION, run_id: runId, metrics: [] };
  if (stage === 'dashboard') return { schema_version: EVIDENCE_SCHEMA_VERSION, run_id: runId, metrics: [] };
  if (stage === 'validation') return { schema_version: EVIDENCE_SCHEMA_VERSION, run_id: runId, status: 'not_run', checks: [] };
  return [];
};

const assertSafeRunId = (runId) => {
  if (!/^[a-z0-9][a-z0-9._:-]*$/.test(runId)) throw new Error('run_id must be a stable lowercase identifier.');
};

const runDirectory = (root, runId) => {
  assertSafeRunId(runId);
  const resolvedRoot = path.resolve(root);
  const resolvedRun = path.resolve(resolvedRoot, runId);
  if (!resolvedRun.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error('Run directory escaped the configured runs root.');
  return resolvedRun;
};

async function atomicWrite(file, content) {
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  const serialized = typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`;
  await fs.writeFile(temporary, serialized, { encoding: 'utf8', flag: 'wx' });
  await fs.rename(temporary, file);
}

export async function readRunManifest(runId, root = RUNS_DIR) {
  const directory = runDirectory(root, runId);
  return runManifestSchemaV1.parse(JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8')));
}

export async function initializeRunWorkspace({ runId, windowStart, windowEnd, sourceRegistryCommit, methodologyVersion = 'evidence-v1', startedAt = new Date().toISOString() }, root = RUNS_DIR) {
  const directory = runDirectory(root, runId);
  const manifest = runManifestSchemaV1.parse({
    run_id: runId, window_start: windowStart, window_end: windowEnd, schema_version: EVIDENCE_SCHEMA_VERSION,
    methodology_version: methodologyVersion, model: REPORT_MODEL_CONFIG.defaultModel, reasoning_effort: REPORT_MODEL_CONFIG.reasoningEffort,
    source_registry_commit: sourceRegistryCommit, started_at: startedAt, completed_at: null, status: 'initialized',
    stages: Object.fromEntries(runStageNames.map((stage) => [stage, 'pending'])), failure: null
  });

  await fs.mkdir(path.dirname(directory), { recursive: true });
  await fs.mkdir(directory);
  try {
    await atomicWrite(path.join(directory, 'manifest.json'), manifest);
    for (const stage of runStageNames) await atomicWrite(path.join(directory, RUN_STAGE_FILES[stage]), emptyStage(stage, runId));
  } catch (error) {
    const failed = { ...manifest, status: 'failed', completed_at: new Date().toISOString(), failure: `Workspace initialization failed: ${error.message}` };
    await atomicWrite(path.join(directory, 'manifest.json'), runManifestSchemaV1.parse(failed)).catch(() => {});
    throw error;
  }
  return { directory, manifest };
}

export async function writeRunStage(runId, stage, value, root = RUNS_DIR) {
  if (!runStageNames.includes(stage)) throw new Error(`Unknown run stage: ${stage}`);
  const directory = runDirectory(root, runId);
  const manifest = await readRunManifest(runId, root);
  if (['failed', 'complete'].includes(manifest.status)) throw new Error(`Cannot write to a ${manifest.status} run.`);
  const stageIndex = runStageNames.indexOf(stage);
  const preceding = runStageNames.slice(0, stageIndex).find((name) => manifest.stages[name] !== 'written');
  if (preceding) throw new Error(`Cannot write ${stage} before ${preceding}.`);

  let content = value;
  if (stage === 'source-discovery') {
    content = sourceDiscoverySchemaV1.parse(value);
  } else if (['observations', 'normalized'].includes(stage)) {
    if (!Array.isArray(value)) throw new Error(`${stage} must be an array of observations.`);
    value.forEach((record) => observationSchemaV1.parse(record));
    content = value.map((record) => JSON.stringify(record)).join('\n') + (value.length ? '\n' : '');
  } else if (stage === 'events') {
    if (!Array.isArray(value)) throw new Error('events must be an array.');
    value.forEach((record) => eventSchemaV1.parse(record));
    content = value.map((record) => JSON.stringify(record)).join('\n') + (value.length ? '\n' : '');
  } else if (stage === 'candidate-findings') {
    content = candidateFindingCollectionSchemaV1.parse(value);
  } else if (['validated-findings', 'rejected-findings'].includes(stage)) {
    content = challengedFindingCollectionSchemaV1.parse(value);
  } else if (stage === 'report' && typeof value !== 'string') {
    throw new Error('report must be Markdown text.');
  }

  await atomicWrite(path.join(directory, RUN_STAGE_FILES[stage]), content);
  const updated = runManifestSchemaV1.parse({ ...manifest, status: 'running', stages: { ...manifest.stages, [stage]: 'written' } });
  await atomicWrite(path.join(directory, 'manifest.json'), updated);
  return updated;
}

export async function failRun(runId, reason, root = RUNS_DIR, completedAt = new Date().toISOString()) {
  const directory = runDirectory(root, runId);
  const manifest = await readRunManifest(runId, root);
  const failed = runManifestSchemaV1.parse({ ...manifest, status: 'failed', completed_at: completedAt, failure: reason });
  await atomicWrite(path.join(directory, 'manifest.json'), failed);
  return failed;
}

export async function completeRun(runId, root = RUNS_DIR, completedAt = new Date().toISOString()) {
  const directory = runDirectory(root, runId);
  const manifest = await readRunManifest(runId, root);
  if (manifest.stages.validation !== 'written') throw new Error('A run cannot complete before validation.json is written.');
  const complete = runManifestSchemaV1.parse({ ...manifest, status: 'complete', completed_at: completedAt, failure: null });
  await atomicWrite(path.join(directory, 'manifest.json'), complete);
  return complete;
}

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { completeRun, readRunManifest, RUNS_DIR, RUN_STAGE_FILES } from './run-workspace.mjs';
import { validateCompleteRun } from './final-pipeline.mjs';

const buildSite = () => {
  const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (build.error || build.status !== 0) throw new Error('Production build failed.');
};

export async function publishRun(runId, { root = RUNS_DIR, reportsRoot = path.resolve('src/data/reports'),
  evidenceRoot = path.resolve('data/evidence'), build = buildSite, commit = false } = {}) {
  const manifest = await readRunManifest(runId, root);
  await validateCompleteRun(runId, root);
  const base = path.join(root, runId);
  const anomalies = JSON.parse(await fs.readFile(path.join(base, RUN_STAGE_FILES.anomalies), 'utf8'));
  if (anomalies.items.some((item) => item.classification === 'requires_review')) throw new Error('Publication blocked by an anomaly requiring review.');
  const date = runId.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) throw new Error('run_id must contain the publication date.');
  const reportTarget = path.join(reportsRoot, `${date}.md`);
  const evidenceTarget = path.join(evidenceRoot, `report-${date}`);
  const evidenceTemporary = `${evidenceTarget}.tmp-${process.pid}`;
  const evidenceBackup = `${evidenceTarget}.backup-${process.pid}`;
  const priorReport = await fs.readFile(reportTarget).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
  let movedEvidence = false;
  let installedEvidence = false;
  await fs.mkdir(reportsRoot, { recursive: true });
  await fs.mkdir(evidenceRoot, { recursive: true });
  try {
    await fs.copyFile(path.join(base, RUN_STAGE_FILES.report), reportTarget);
    await build();
    await completeRun(runId, root);
    await fs.cp(base, evidenceTemporary, { recursive: true, errorOnExist: true, force: false });
    try { await fs.rename(evidenceTarget, evidenceBackup); movedEvidence = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.rename(evidenceTemporary, evidenceTarget);
    installedEvidence = true;
    if (commit) {
      for (const args of [['add', '--', reportTarget, evidenceTarget], ['commit', '-m', `Publish Observatory report ${date}`]]) {
        const result = spawnSync('git', args, { stdio: 'inherit' });
        if (result.error || result.status !== 0) throw new Error(`git ${args[0]} failed.`);
      }
    }
  } catch (error) {
    if (priorReport !== null) await fs.writeFile(reportTarget, priorReport);
    else await fs.rm(reportTarget, { force: true });
    if (installedEvidence) await fs.rm(evidenceTarget, { recursive: true, force: true });
    if (movedEvidence) await fs.rename(evidenceBackup, evidenceTarget);
    throw error;
  } finally {
    await fs.rm(evidenceTemporary, { recursive: true, force: true });
  }
  if (movedEvidence) await fs.rm(evidenceBackup, { recursive: true, force: true });
  console.log(`Prepared ${date}: report and complete evidence record${commit ? ' committed locally' : ' saved locally'}.`);
  return { reportTarget, evidenceTarget, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const runId = argument('run-id');
  if (!runId) throw new Error('Use --run-id=<id> [--commit=true].');
  await publishRun(runId, { commit: argument('commit') === 'true' });
}

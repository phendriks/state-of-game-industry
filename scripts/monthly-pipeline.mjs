import fs from 'node:fs/promises';
import path from 'node:path';
import { collectMonthlyEvidence } from './collect-monthly-evidence.mjs';
import { reportObservations } from './report-evidence.mjs';
import { reportWindow } from './report-lib.mjs';
import { pipelineOpenAIClient } from './pipeline-openai.mjs';
import { initializeRunWorkspace, failRun, RUNS_DIR, writeRunStage } from './run-workspace.mjs';
import { createAcquisitionPlan } from './source-acquisition.mjs';
import { validateAndStoreAtomicObservations } from './observation-extraction.mjs';
import { reconcileEventCandidates } from './reconciliation.mjs';
import { generateCandidateFindings, challengeCandidateFindings } from './finding-pipeline.mjs';
import { calculateDeterministicMetrics, selectFindings, compareAndCheck, buildDashboardArtifact, writeValidatedReport, validateCompleteRun } from './final-pipeline.mjs';

export async function generateMonthlyRun({ reportDate, runId = `report-${reportDate}`, sourceRegistryCommit = 'working-tree', previousRunDirectory = null },
  { root = RUNS_DIR, client, collect = collectMonthlyEvidence } = {}) {
  const window = reportWindow(reportDate);
  const { directory } = await initializeRunWorkspace({ runId, windowStart: window.periodStart, windowEnd: window.periodEnd, sourceRegistryCommit }, root);
  try {
    const api = client ?? pipelineOpenAIClient();
    const discovery = await createAcquisitionPlan(runId, 75, root);
    console.log(`${runId}: collecting registered-source evidence.`);
    const data = await collect(reportDate, api, undefined, (response) => fs.writeFile(path.join(directory, 'collection-response.json'), `${JSON.stringify(response, null, 2)}\n`));
    await fs.writeFile(path.join(directory, 'collected-report.json'), `${JSON.stringify(data, null, 2)}\n`);
    const observations = await validateAndStoreAtomicObservations(runId, reportObservations(data, runId, discovery.acquisition_window), root);
    // Aggregate totals remain observations; they do not establish individual events or job postings.
    await reconcileEventCandidates(runId, [], new Set(observations.map((item) => item.observation_id)), root);
    await writeRunStage(runId, 'normalized', observations, root);
    await calculateDeterministicMetrics(runId, root);
    console.log(`${runId}: generating and challenging findings.`);
    await generateCandidateFindings(runId, api, root);
    await challengeCandidateFindings(runId, api, root);
    await selectFindings(runId, root);
    await compareAndCheck(runId, previousRunDirectory, root);
    await buildDashboardArtifact(runId, root);
    await writeValidatedReport(runId, api, root);
    await validateCompleteRun(runId, root);
    console.log(`${runId}: validated; publication has not occurred.`);
    return { runId, directory, reportDate };
  } catch (error) {
    await failRun(runId, error.message, root);
    throw error;
  }
}

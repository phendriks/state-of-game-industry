import { buildDashboardArtifact, compareAndCheck, selectFindings, validateCompleteRun, writeValidatedReport } from './final-pipeline.mjs';
import { readArgument } from './script-input.mjs';
const runId=readArgument('run-id'); if(!runId)throw new Error('Use --run-id=<id>.');
await selectFindings(runId); await compareAndCheck(runId,readArgument('previous-run')??null); await buildDashboardArtifact(runId); await writeValidatedReport(runId); await validateCompleteRun(runId);
console.log(`Finalized and validated ${runId}; publication has not occurred.`);

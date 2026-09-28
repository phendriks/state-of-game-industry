import { buildDashboardArtifact, compareAndCheck, selectFindings, validateCompleteRun, writeValidatedReport } from './final-pipeline.mjs';
const argument=(name)=>process.argv.find((value)=>value.startsWith(`--${name}=`))?.slice(name.length+3); const runId=argument('run-id'); if(!runId)throw new Error('Use --run-id=<id>.');
await selectFindings(runId); await compareAndCheck(runId,argument('previous-run')??null); await buildDashboardArtifact(runId); await writeValidatedReport(runId); await validateCompleteRun(runId);
console.log(`Finalized and validated ${runId}; publication has not occurred.`);

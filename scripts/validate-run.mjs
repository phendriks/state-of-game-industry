import { validateCompleteRun } from './final-pipeline.mjs';
const runId=process.argv.find((value)=>value.startsWith('--run-id='))?.split('=')[1]; if(!runId)throw new Error('Use --run-id=<id>.'); await validateCompleteRun(runId); console.log(`Validated ${runId}.`);

import { calculateDeterministicMetrics } from './final-pipeline.mjs';
const runId=process.argv.find((value)=>value.startsWith('--run-id='))?.split('=')[1]; if(!runId)throw new Error('Use --run-id=<id>.');
const result=await calculateDeterministicMetrics(runId); console.log(`Wrote ${result.metrics.length} deterministic metric(s).`);

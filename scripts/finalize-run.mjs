import { finalizeRun } from './final-pipeline.mjs';
import { readArgument } from './script-input.mjs';

const runId = readArgument('run-id');
if (!runId) throw new Error('Use --run-id=<id>.');
await finalizeRun(runId, { previousRunDirectory: readArgument('previous-run') ?? null });
console.log(`Finalized and validated ${runId}; publication has not occurred.`);

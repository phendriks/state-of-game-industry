import { generateCandidateFindings } from './finding-pipeline.mjs';
const runId = process.argv.find((value) => value.startsWith('--run-id='))?.split('=')[1];
if (!runId) throw new Error('Usage: npm run findings:generate -- --run-id=<id>');
const findings = await generateCandidateFindings(runId);
console.log(`Stored ${findings.length} candidate findings. None are published.`);

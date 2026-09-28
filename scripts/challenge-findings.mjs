import { challengeCandidateFindings } from './finding-pipeline.mjs';
const runId = process.argv.find((value) => value.startsWith('--run-id='))?.split('=')[1];
if (!runId) throw new Error('Usage: npm run findings:challenge -- --run-id=<id>');
const result = await challengeCandidateFindings(runId);
console.log(`Adversarial review stored ${result.validated.length} surviving and ${result.rejected.length} rejected or insufficient finding(s).`);

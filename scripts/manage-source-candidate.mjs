import { addCandidateSource, evaluateCandidateSource } from './source-acquisition.mjs';

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const action = argument('action');
const runId = argument('run-id');
if (!runId || !['add', 'evaluate'].includes(action)) throw new Error('Use --action=add|evaluate and --run-id=<id>.');

if (action === 'add') {
  const required = ['candidate-id', 'name', 'publisher', 'url', 'geography', 'needed-for'];
  const missing = required.filter((name) => !argument(name));
  if (missing.length) throw new Error(`Missing candidate arguments: ${missing.join(', ')}`);
  await addCandidateSource(runId, {
    candidateId: argument('candidate-id'), name: argument('name'), publisher: argument('publisher'), canonicalUrl: argument('url'),
    geography: argument('geography'), neededFor: argument('needed-for'), evidenceClass: argument('evidence-class') ?? 'window'
  });
  console.log(`Recorded candidate ${argument('candidate-id')} without changing the permanent registry.`);
} else {
  if (!argument('candidate-id') || !argument('decision') || !argument('note')) throw new Error('Evaluation requires --candidate-id, --decision and --note.');
  await evaluateCandidateSource(runId, argument('candidate-id'), {
    decision: argument('decision'), reason: argument('reason') ?? null, note: argument('note'), proposeRegistryUpdate: argument('propose-registry-update') === 'true'
  });
  console.log(`Evaluated candidate ${argument('candidate-id')}; the permanent registry was not changed.`);
}

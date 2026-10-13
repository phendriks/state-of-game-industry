import { addCandidateSource, evaluateCandidateSource } from './source-acquisition.mjs';
import { readArgument } from './script-input.mjs';

const action = readArgument('action');
const runId = readArgument('run-id');
if (!runId || !['add', 'evaluate'].includes(action)) throw new Error('Use --action=add|evaluate and --run-id=<id>.');

if (action === 'add') {
  const required = ['candidate-id', 'name', 'publisher', 'url', 'geography', 'needed-for'];
  const missing = required.filter((name) => !readArgument(name));
  if (missing.length) throw new Error(`Missing candidate arguments: ${missing.join(', ')}`);
  await addCandidateSource(runId, {
    candidateId: readArgument('candidate-id'), name: readArgument('name'), publisher: readArgument('publisher'), canonicalUrl: readArgument('url'),
    geography: readArgument('geography'), neededFor: readArgument('needed-for'), evidenceClass: readArgument('evidence-class') ?? 'window'
  });
  console.log(`Recorded candidate ${readArgument('candidate-id')} without changing the permanent registry.`);
} else {
  if (!readArgument('candidate-id') || !readArgument('decision') || !readArgument('note')) throw new Error('Evaluation requires --candidate-id, --decision and --note.');
  await evaluateCandidateSource(runId, readArgument('candidate-id'), {
    decision: readArgument('decision'), reason: readArgument('reason') ?? null, note: readArgument('note'), proposeRegistryUpdate: readArgument('propose-registry-update') === 'true'
  });
  console.log(`Evaluated candidate ${readArgument('candidate-id')}; the permanent registry was not changed.`);
}

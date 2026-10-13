import fs from 'node:fs/promises';
import path from 'node:path';
import { reconcileEventCandidates } from './reconciliation.mjs';
import { readArgument } from './script-input.mjs';

const runId = readArgument('run-id'); const input = readArgument('input');
if (!runId || !input) throw new Error('Usage: npm run reconciliation:events -- --run-id=<id> --input=<candidate-events.json>');
const candidates = JSON.parse(await fs.readFile(input, 'utf8'));
const observationFile = path.resolve('data/runs', runId, 'observations.jsonl');
const observations = (await fs.readFile(observationFile, 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const events = await reconcileEventCandidates(runId, candidates, new Set(observations.map((item) => item.observation_id)));
console.log(`Reconciled ${candidates.length} candidate mention(s) into ${events.length} canonical event(s).`);

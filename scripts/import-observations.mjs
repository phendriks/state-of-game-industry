import fs from 'node:fs/promises';
import { validateAndStoreAtomicObservations } from './observation-extraction.mjs';

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const runId = argument('run-id');
const input = argument('input');
if (!runId || !input) throw new Error('Usage: npm run observations:import -- --run-id=<id> --input=<json-or-jsonl>');
const raw = await fs.readFile(input, 'utf8');
const records = input.endsWith('.jsonl') ? raw.split(/\r?\n/).filter((line) => line.trim()).map(JSON.parse) : JSON.parse(raw);
const observations = await validateAndStoreAtomicObservations(runId, records);
console.log(`Stored ${observations.length} validated atomic observation(s); no report prose was generated.`);

import fs from 'node:fs/promises';
import { reconcileJobs } from './reconciliation.mjs';
import { readArgument } from './script-input.mjs';

const input = readArgument('input'); const previousFile = readArgument('previous'); const output = readArgument('output'); const observedAt = readArgument('observed-at');
if (!input || !output || !observedAt) throw new Error('Usage: npm run reconciliation:jobs -- --input=<postings.json> --output=<jobs.json> --observed-at=<ISO timestamp> [--previous=<jobs.json>]');
const postings = JSON.parse(await fs.readFile(input, 'utf8'));
const previous = previousFile ? JSON.parse(await fs.readFile(previousFile, 'utf8')) : [];
const jobs = reconcileJobs(previous, postings, observedAt);
await fs.writeFile(output, `${JSON.stringify(jobs, null, 2)}\n`, 'utf8');
console.log(`Wrote ${jobs.length} reconciled job record(s).`);

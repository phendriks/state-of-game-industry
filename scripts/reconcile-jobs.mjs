import fs from 'node:fs/promises';
import { reconcileJobs } from './reconciliation.mjs';

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const input = argument('input'); const previousFile = argument('previous'); const output = argument('output'); const observedAt = argument('observed-at');
if (!input || !output || !observedAt) throw new Error('Usage: npm run reconciliation:jobs -- --input=<postings.json> --output=<jobs.json> --observed-at=<ISO timestamp> [--previous=<jobs.json>]');
const postings = JSON.parse(await fs.readFile(input, 'utf8'));
const previous = previousFile ? JSON.parse(await fs.readFile(previousFile, 'utf8')) : [];
const jobs = reconcileJobs(previous, postings, observedAt);
await fs.writeFile(output, `${JSON.stringify(jobs, null, 2)}\n`, 'utf8');
console.log(`Wrote ${jobs.length} reconciled job record(s).`);

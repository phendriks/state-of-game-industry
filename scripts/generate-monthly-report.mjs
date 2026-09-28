import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveReportDate } from './report-lib.mjs';
import { generateMonthlyRun } from './monthly-pipeline.mjs';

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const reportDate = resolveReportDate(argument('report-date') ?? process.env.REPORT_DATE);
console.log(`Selected monthly publication date: ${reportDate}.`);
const runId = argument('run-id') ?? `report-${reportDate}-${Date.now()}`;
const evidenceRoot = path.resolve('data/evidence');
const previous = (await fs.readdir(evidenceRoot).catch(() => []))
  .filter((name) => /^report-\d{4}-\d{2}-\d{2}$/.test(name) && name.slice(7) < reportDate)
  .sort().at(-1);
const result = await generateMonthlyRun({ reportDate, runId,
  sourceRegistryCommit: process.env.GITHUB_SHA ?? 'working-tree',
  previousRunDirectory: previous ? path.join(evidenceRoot, previous) : null });
if (process.env.GITHUB_OUTPUT) {
  await fs.appendFile(process.env.GITHUB_OUTPUT, `report_date=${result.reportDate}\nrun_id=${result.runId}\nrun_directory=${result.directory}\n`);
}

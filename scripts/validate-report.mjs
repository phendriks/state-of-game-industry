import path from 'node:path';
import { NEWS_SOURCES } from '../src/data/newsSources.ts';
import { REPORTS_DIR, amsterdamDate, readReport, reportWindow } from './report-lib.mjs';

const requestedDate = process.argv.find((arg) => arg.startsWith('--report-date='))?.split('=')[1];
const reportDate = requestedDate ?? amsterdamDate();
const expected = reportWindow(reportDate);
const file = path.join(REPORTS_DIR, `${reportDate}.md`);
const { data, body } = await readReport(file);
const errors = [];
const sources = new Set(NEWS_SOURCES.map((source) => source.name));

if (String(data.published) !== expected.published) errors.push('published does not match the file date');
if (String(data.period_start) !== expected.periodStart) errors.push(`period_start must be ${expected.periodStart}`);
if (String(data.period_end) !== expected.periodEnd) errors.push(`period_end must be ${expected.periodEnd}`);
if (data.human_reviewed !== false) errors.push('unattended reports must set human_reviewed to false');
if (!Array.isArray(data.metrics) || data.metrics.length < 12) errors.push('at least 12 observations are required');

const ids = new Set();
for (const [index, metric] of (data.metrics ?? []).entries()) {
  if (ids.has(metric.id)) errors.push(`duplicate metric id: ${metric.id}`);
  ids.add(metric.id);
  if (!sources.has(metric.source)) errors.push(`metric ${index + 1} uses an unregistered source: ${metric.source}`);
  if (!Number.isFinite(metric.value)) errors.push(`metric ${metric.id} has no finite numeric value`);
  if (!metric.observed_on || !metric.scope || !metric.display_value) errors.push(`metric ${metric.id} lacks required context`);
  if (!metric.carried_forward && (!metric.source_url || !metric.evidence_excerpt || !metric.published_on)) {
    errors.push(`new metric ${metric.id} lacks source evidence or publication date`);
  }
  if (!metric.carried_forward && (metric.published_on < expected.periodStart || metric.published_on > expected.periodEnd)) {
    errors.push(`new metric ${metric.id} was not published inside the reporting window`);
  }
  if (metric.evidence_excerpt && metric.evidence_excerpt.trim().split(/\s+/).length > 25) {
    errors.push(`metric ${metric.id} evidence excerpt exceeds 25 words`);
  }
}

const summary = body.replace(/^#.*$/gm, '').replace(/^##.*$/gm, '').trim();
const wordCount = summary.split(/\s+/).filter(Boolean).length;
if (wordCount < 350 || wordCount > 550) errors.push(`industry summary must contain 350-550 words; found ${wordCount}`);

if (errors.length) throw new Error(`Report validation failed:\n- ${errors.join('\n- ')}`);
console.log(`Validated ${file}: ${data.metrics.length} observations, ${wordCount} summary words.`);

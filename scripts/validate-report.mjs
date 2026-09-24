import path from 'node:path';
import { NEWS_SOURCES } from '../src/data/newsSources.ts';
import { SNAPSHOT_INDICATORS, SNAPSHOT_INDICATOR_KEYS } from '../src/data/snapshotIndicators.ts';
import { STATISTICAL_SOURCES } from '../src/data/statisticalSources.ts';
import { REPORTS_DIR, amsterdamDate, hostnameMatches, readReport, reportWindow } from './report-lib.mjs';

const requestedDate = process.argv.find((arg) => arg.startsWith('--report-date='))?.split('=')[1];
const reportDate = requestedDate ?? amsterdamDate();
const expected = reportWindow(reportDate);
const file = path.join(REPORTS_DIR, `${reportDate}.md`);
const { data, body } = await readReport(file);
const errors = [];
const sources = new Set(NEWS_SOURCES.map((source) => source.name));
const statisticalSources = new Map(STATISTICAL_SOURCES.map((source) => [source.id, source]));
const metrics = Array.isArray(data.metrics) ? data.metrics : [];
const statisticalObservations = Array.isArray(data.statistical_observations) ? data.statistical_observations : [];

if (String(data.published) !== expected.published) errors.push('published does not match the file date');
if (String(data.period_start) !== expected.periodStart) errors.push(`period_start must be ${expected.periodStart}`);
if (String(data.period_end) !== expected.periodEnd) errors.push(`period_end must be ${expected.periodEnd}`);
if (typeof data.human_reviewed !== 'boolean') errors.push('human_reviewed must be a boolean');
if (data.human_reviewed && !data.reviewer) errors.push('a reviewer is required when human_reviewed is true');
if (!Array.isArray(data.metrics)) errors.push('metrics must be an array');
if (data.statistical_observations !== undefined && !Array.isArray(data.statistical_observations)) {
  errors.push('statistical_observations must be an array when present');
}
if (data.snapshot) {
  const snapshotKeys = Object.keys(data.snapshot);
  const unexpectedKeys = snapshotKeys.filter((key) => !SNAPSHOT_INDICATOR_KEYS.includes(key));
  if (unexpectedKeys.length) errors.push(`unexpected snapshot indicators: ${unexpectedKeys.join(', ')}`);
}

const statisticalIds = new Set();
for (const [index, observation] of statisticalObservations.entries()) {
  if (statisticalIds.has(observation.id)) errors.push(`duplicate statistical observation id: ${observation.id}`);
  statisticalIds.add(observation.id);
  const source = statisticalSources.get(observation.source_id);
  if (!source) errors.push(`statistical observation ${index + 1} uses an unregistered source: ${observation.source_id}`);
  if (source && !hostnameMatches(observation.source_url, source.url)) {
    errors.push(`statistical observation ${observation.id} does not use its registered official source domain`);
  }
  if (!Number.isFinite(observation.original_value)) errors.push(`statistical observation ${observation.id} has no finite numeric value`);
  if (!observation.label || !observation.display_value || !observation.reference_period || !observation.observed_on) {
    errors.push(`statistical observation ${observation.id} lacks required display or period context`);
  }
  if (observation.observed_on > expected.periodEnd) errors.push(`statistical observation ${observation.id} is dated after the report period`);
  if (observation.release_date && observation.release_date > expected.periodEnd) errors.push(`statistical observation ${observation.id} was released after the report period`);
  if (!observation.source_url || !observation.evidence_excerpt || !observation.methodology_version) {
    errors.push(`statistical observation ${observation.id} lacks provenance`);
  }
  if (observation.evidence_excerpt?.trim().split(/\s+/).length > 25) {
    errors.push(`statistical observation ${observation.id} evidence excerpt exceeds 25 words`);
  }
}

if (data.talent_pipeline) {
  const observationsById = new Map(statisticalObservations.map((observation) => [observation.id, observation]));
  const references = [
    ['game_program_entrants', data.talent_pipeline.entrants],
    ['annual_game_specific_graduates', data.talent_pipeline.graduate_supply],
    ['workforce_contraction', data.talent_pipeline.workforce_flow?.workforce_contraction],
    ['industry_outflow', data.talent_pipeline.workforce_flow?.industry_outflow]
  ].filter(([, reference]) => Boolean(reference));
  for (const [expectedMeasure, reference] of references) {
    for (const observationId of reference.observation_ids ?? []) {
      if (!statisticalIds.has(observationId)) errors.push(`talent snapshot references missing observation ${observationId}`);
      if (observationsById.get(observationId)?.measure !== expectedMeasure) {
        errors.push(`talent snapshot ${expectedMeasure} references incompatible observation ${observationId}`);
      }
    }
  }
}

const ids = new Set();
for (const [index, metric] of metrics.entries()) {
  if (ids.has(metric.id)) errors.push(`duplicate metric id: ${metric.id}`);
  ids.add(metric.id);
  if (!sources.has(metric.source)) errors.push(`metric ${index + 1} uses an unregistered source: ${metric.source}`);
  if (!Number.isFinite(metric.value)) errors.push(`metric ${metric.id} has no finite numeric value`);
  if (!metric.observed_on || !metric.scope || !metric.display_value) errors.push(`metric ${metric.id} lacks required context`);
  if (!metric.carried_forward && metric.kind !== 'Calculated' && (!metric.source_url || !metric.evidence_excerpt || !metric.published_on)) {
    errors.push(`new metric ${metric.id} lacks source evidence or publication date`);
  }
  if (!metric.carried_forward && (metric.published_on < expected.periodStart || metric.published_on > expected.periodEnd)) {
    errors.push(`new metric ${metric.id} was not published inside the reporting window`);
  }
  if (metric.evidence_excerpt && metric.evidence_excerpt.trim().split(/\s+/).length > 25) {
    errors.push(`metric ${metric.id} evidence excerpt exceeds 25 words`);
  }
}

if (data.snapshot) {
  for (const indicator of SNAPSHOT_INDICATORS) {
    const metricId = data.snapshot[indicator.key];
    if (!metricId) continue;
    if (!ids.has(metricId)) errors.push(`snapshot indicator ${indicator.key} references missing metric ${metricId}`);
    if (!indicator.metricIds.includes(metricId)) {
      errors.push(`snapshot indicator ${indicator.key} cannot reference ${metricId}`);
    }
  }
}

const summary = body.replace(/^#.*$/gm, '').replace(/^##.*$/gm, '').trim();
const wordCount = summary.split(/\s+/).filter(Boolean).length;

if (errors.length) throw new Error(`Report validation failed:\n- ${errors.join('\n- ')}`);
console.log(`Validated ${file}: ${metrics.length} observations, ${wordCount} summary words.`);

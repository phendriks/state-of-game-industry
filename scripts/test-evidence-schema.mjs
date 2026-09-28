import assert from 'node:assert/strict';
import {
  evidenceReportSchemaV1,
  eventSchemaV1,
  findingSchemaV1,
  observationSchemaV1,
  sourceSchemaV1
} from '../src/data/evidence/schema-v1.ts';

const valid = {
  schema_version: '1.0.0', methodology_version: 'evidence-v1', observation_id: 'newzoo-2026-revenue', run_id: 'run-2026-09-24',
  entity: 'Global games market', entity_type: 'market', metric: 'games_revenue', value: 213.9, original_value: '$213.9 billion', unit: 'billion_usd',
  reference_period_start: '2026-01-01', reference_period_end: '2026-12-31', observed_at: '2026-09-15T00:00:00Z', retrieved_at: '2026-09-24T08:00:00Z',
  source_id: 'newzoo-2026-global-market-report', source_url: 'https://newzoo.com/articles/executive-summary-ggmr-2026-free-edition', underlying_source_id: null,
  geography: 'Global', evidence_type: 'forecast', evidence_class: 'window', confidence: 'high', raw_claim: 'The global games market is forecast to generate $213.9 billion in 2026.', normalized_claim: 'Global games revenue forecast for 2026 is USD 213.9 billion.'
};

assert.equal(observationSchemaV1.safeParse(valid).success, true);
assert.equal(observationSchemaV1.safeParse({ ...valid, source_url: 'not-a-url' }).success, false);
assert.equal(observationSchemaV1.safeParse({ ...valid, reference_period_start: '2027-01-01' }).success, false);
assert.equal(observationSchemaV1.safeParse({ ...valid, underlying_source_id: valid.source_id }).success, false);
assert.equal(observationSchemaV1.safeParse({ ...valid, schema_version: '2.0.0' }).success, false);

assert.equal(sourceSchemaV1.safeParse({
  schema_version: '1.0.0', source_id: 'newzoo-2026-global-market-report', name: 'Global Games Market Report 2026', publisher: 'Newzoo',
  canonical_url: 'https://newzoo.com/articles/executive-summary-ggmr-2026-free-edition', source_type: 'research', geography: 'Global', language: 'English',
  frequency: 'Annual', role: 'Market forecasts and player estimates', limitations: 'Forecast methodology and paid-detail availability vary by edition.', active: true
}).success, true);

assert.equal(eventSchemaV1.safeParse({
  schema_version: '1.0.0', methodology_version: 'evidence-v1', event_id: 'event-example', run_id: 'run-2026-09-24', event_type: 'market_forecast_published',
  entity_ids: ['global-games-market'], event_start: '2026-09-15', geography: 'Global', observation_ids: ['newzoo-2026-revenue'], factual_summary: 'Newzoo published its 2026 market forecast.'
}).success, true);

assert.equal(findingSchemaV1.safeParse({
  schema_version: '1.0.0', methodology_version: 'evidence-v1', finding_id: 'finding-example', run_id: 'run-2026-09-24', title: 'Forecast growth',
  statement: 'The cited forecast expects year-over-year market growth.', observation_ids: ['newzoo-2026-revenue'], event_ids: ['event-example'], status: 'draft', limitations: ['This is a forecast rather than an audited result.']
}).success, true);

assert.equal(evidenceReportSchemaV1.safeParse({
  schema_version: '1.0.0', methodology_version: 'evidence-v1', report_id: 'report-2026-09-24', run_id: 'run-2026-09-24', title: 'September 2026 snapshot',
  window_start: '2026-08-24', window_end: '2026-09-23', published_at: '2026-09-24T08:00:00Z', finding_ids: ['finding-example'], observation_ids: ['newzoo-2026-revenue']
}).success, true);

console.log('Evidence schema tests passed.');

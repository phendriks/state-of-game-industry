import { NEWS_SOURCES } from '../src/data/newsSources.ts';
import { observationSchemaV1 } from '../src/data/evidence/schema-v1.ts';

const slug = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const date = (value) => String(value).slice(0, 10);
const instant = (value) => `${date(value)}T00:00:00Z`;
const kinds = { Forecast: 'forecast', Estimate: 'estimated', Calculated: 'derived', Reported: 'reported' };

export function reportObservations(data, runId, acquisitionWindow) {
  const newsByName = new Map(NEWS_SOURCES.map((source) => [source.name, source]));
  const records = (data.metrics ?? []).map((metric) => {
    const source = newsByName.get(metric.source);
    if (!source) throw new Error(`Unregistered report source: ${metric.source}`);
    if (!metric.source_url || !metric.evidence_excerpt) throw new Error(`Metric ${metric.id} lacks stored source evidence.`);
    const publicationDate = date(metric.published_on ?? metric.collected_on ?? data.published);
    const origin = newsByName.get(metric.origin);
    return {
      observation_id: `${runId}-${metric.id}`.replace(/_/g, '-'), entity: metric.scope,
      entity_type: metric.category === 'Products' ? 'game' : metric.category === 'Corporate' ? 'company' : metric.category === 'Employment' ? 'workforce' : 'market',
      metric: metric.id, value: metric.value, original_value: metric.display_value, unit: metric.unit ?? 'source-defined',
      reference_period_start: date(metric.period_start ?? metric.observed_on), reference_period_end: date(metric.period_end ?? metric.observed_on),
      observed_at: instant(publicationDate), retrieved_at: instant(metric.collected_on ?? data.published),
      source_id: `news-${slug(metric.source)}`, source_url: metric.source_url,
      underlying_source_id: metric.source_relationship === 'Repeats / cites' && origin && origin.name !== source.name ? `news-${slug(origin.name)}` : null,
      geography: metric.scope, evidence_type: kinds[metric.kind],
      evidence_class: metric.carried_forward ? 'historical_baseline' : publicationDate >= acquisitionWindow.start && publicationDate <= acquisitionWindow.end ? 'window' : 'context',
      confidence: metric.kind === 'Reported' ? 'high' : 'medium', raw_claim: metric.evidence_excerpt,
      normalized_claim: `${metric.label}: ${metric.display_value}. ${metric.detail}`
    };
  });
  for (const item of data.statistical_observations ?? []) {
    records.push({
      observation_id: `${runId}-stat-${item.id}`.replace(/_/g, '-'), entity: item.dataset_name,
      entity_type: ['annual_game_specific_graduates', 'game_program_entrants'].includes(item.measure) ? 'education' : 'workforce',
      metric: slug(item.measure).replaceAll('-', '_'), value: item.derived_value ?? item.original_value, original_value: item.original_value,
      unit: item.original_unit, reference_period_start: date(item.observed_on), reference_period_end: date(item.observed_on),
      observed_at: instant(item.release_date ?? item.observed_on), retrieved_at: instant(item.retrieved_at),
      source_id: `stat-${item.source_id}`, source_url: item.source_url, underlying_source_id: null, geography: item.geography,
      evidence_type: item.transformation ? 'derived' : 'reported', evidence_class: item.carried_forward ? 'historical_baseline' : 'context',
      confidence: 'high', raw_claim: item.evidence_excerpt, normalized_claim: `${item.label}: ${item.display_value}. ${item.detail}`,
      ...(item.dataset_id ? { dataset_id: item.dataset_id } : {}), ...(item.table_id ? { table_id: item.table_id } : {}),
      ...(item.query_or_filters ? { query_or_filter: item.query_or_filters } : {}), ...(item.raw_file_hash ? { source_hash: item.raw_file_hash } : {})
    });
  }
  return records.map((record) => observationSchemaV1.parse({ ...record, schema_version: '1.0.0', methodology_version: 'evidence-v1', run_id: runId }));
}

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { NEWS_SOURCES } from './data/newsSources';
import { SNAPSHOT_INDICATORS, SNAPSHOT_INDICATOR_KEYS } from './data/snapshotIndicators';
import { STATISTICAL_OBSERVATION_PRECISION_CLASSES } from './data/statisticalFramework';
import { STATISTICAL_SOURCES } from './data/statisticalSources';

const registeredSourceNames = new Set(NEWS_SOURCES.map((source) => source.name));
const registeredStatisticalSourceIds = new Set(STATISTICAL_SOURCES.map((source) => source.id));
const metricReferenceSchema = z.string().regex(/^[a-z0-9_]+$/);
const snapshotSchema = z.object(Object.fromEntries(
  SNAPSHOT_INDICATOR_KEYS.map((key) => [key, metricReferenceSchema])
)).partial();

const metricSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string(),
  value: z.number(),
  display_value: z.string(),
  detail: z.string(),
  scope: z.string().trim().min(1),
  unit: z.string().trim().min(1).optional(),
  category: z.enum(['Market', 'Players', 'Employment', 'Business', 'Corporate', 'Products']),
  kind: z.enum(['Reported', 'Calculated', 'Forecast', 'Estimate']),
  observed_on: z.coerce.date(),
  period_start: z.coerce.date().optional(),
  period_end: z.coerce.date().optional(),
  published_on: z.coerce.date().optional(),
  collected_on: z.coerce.date().optional(),
  source: z.string().refine((source) => registeredSourceNames.has(source), {
    message: 'Metric source must exactly match a source in src/data/newsSources.ts.'
  }),
  source_url: z.string().url().optional(),
  evidence_excerpt: z.string().trim().min(1).optional(),
  carried_forward: z.boolean().default(false),
  origin: z.string().trim().min(1).optional(),
  source_relationship: z.enum([
    'Original source',
    'Repeats / cites',
    'Derived from',
    'First-party',
    'Owned by',
    'Funded by',
    'Independent reporting',
    'Unknown'
  ]).optional(),
  calculation: z.string().trim().min(1).optional(),
  inputs: z.array(z.object({
    label: z.string(),
    value: z.number(),
    display_value: z.string()
  })).min(2).optional(),
  featured: z.boolean().default(false)
}).superRefine((metric, context) => {
  if (metric.kind === 'Calculated' && (!metric.calculation || !metric.inputs)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['calculation'],
      message: 'Calculated metrics require a calculation and at least two stored inputs.'
    });
  }

  if (metric.kind !== 'Calculated' && (metric.calculation || metric.inputs)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['kind'],
      message: 'Calculation metadata is only valid for Calculated metrics.'
    });
  }

  if (metric.period_start && metric.period_end && metric.period_end < metric.period_start) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['period_end'],
      message: 'Metric period_end cannot be before period_start.'
    });
  }
});

const statisticalObservationSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().trim().min(1),
  display_value: z.string().trim().min(1),
  detail: z.string().trim().min(1),
  source_id: z.string().refine((sourceId) => registeredStatisticalSourceIds.has(sourceId), {
    message: 'Statistical source_id must match an id in src/data/statisticalSources.ts.'
  }),
  publisher: z.string().trim().min(1),
  dataset_name: z.string().trim().min(1),
  dataset_id: z.string().trim().min(1).optional(),
  table_id: z.string().trim().min(1).optional(),
  source_url: z.string().url(),
  geography: z.string().trim().min(1),
  reference_period: z.string().trim().min(1),
  observed_on: z.coerce.date(),
  release_date: z.coerce.date().optional(),
  retrieved_at: z.coerce.date(),
  revision_status: z.enum(['provisional', 'revised', 'final', 'unknown']),
  classification_system: z.string().trim().min(1).optional(),
  classification_version: z.string().trim().min(1).optional(),
  classification_code: z.string().trim().min(1).optional(),
  measure: z.string().trim().min(1),
  original_unit: z.string().trim().min(1),
  original_value: z.union([z.number(), z.string().trim().min(1)]),
  query_or_filters: z.string().trim().min(1).optional(),
  transformation: z.string().trim().min(1).optional(),
  derived_value: z.number().optional(),
  methodology_version: z.string().trim().min(1),
  precision_class: z.enum(STATISTICAL_OBSERVATION_PRECISION_CLASSES),
  coverage_notes: z.string().trim().min(1),
  evidence_excerpt: z.string().trim().min(1),
  carried_forward: z.boolean().default(false),
  raw_file_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional()
});

const statisticalMetricReferenceSchema = z.object({
  observation_ids: z.array(z.string().regex(/^[a-z0-9_]+$/)).min(1),
  note: z.string().trim().min(1).optional()
});

const talentPipelineSchema = z.object({
  graduate_supply: statisticalMetricReferenceSchema.optional(),
  entrants: statisticalMetricReferenceSchema.optional(),
  enrollment: statisticalMetricReferenceSchema.optional(),
  entry_level_opportunities: statisticalMetricReferenceSchema.optional(),
  graduate_to_entry_opportunity_ratio: statisticalMetricReferenceSchema.optional(),
  workforce_flow: z.object({
    employer_separation: statisticalMetricReferenceSchema.optional(),
    intra_games_movement: statisticalMetricReferenceSchema.optional(),
    industry_outflow: statisticalMetricReferenceSchema.optional(),
    non_employment_outflow: statisticalMetricReferenceSchema.optional(),
    workforce_contraction: statisticalMetricReferenceSchema.optional(),
    intent_to_leave: statisticalMetricReferenceSchema.optional()
  }).optional()
});

const reportSchema = z.object({
  title: z.string(),
  published: z.coerce.date(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  ai_generated: z.boolean().default(true),
  human_reviewed: z.boolean().default(false),
  reviewer: z.string().trim().min(1).optional(),
  geographic_scope: z.string(),
  global_representativeness: z.string(),
  independently_audited: z.boolean().default(false),
  summary: z.string(),
  snapshot: snapshotSchema.optional(),
  metrics: z.array(metricSchema),
  statistical_observations: z.array(statisticalObservationSchema).optional(),
  talent_pipeline: talentPipelineSchema.optional()
}).superRefine((report, context) => {
  if (report.human_reviewed && !report.reviewer) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reviewer'],
      message: 'A reviewer is required when human_reviewed is true.'
    });
  }


  const duplicateMetricIds = report.metrics
    .map((metric) => metric.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  if (duplicateMetricIds.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['metrics'],
      message: `Metric IDs must be unique within a report: ${[...new Set(duplicateMetricIds)].join(', ')}`
    });
  }

  const duplicateObservationIds = (report.statistical_observations ?? [])
    .map((observation) => observation.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);

  if (duplicateObservationIds.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['statistical_observations'],
      message: `Statistical observation IDs must be unique within a report: ${[...new Set(duplicateObservationIds)].join(', ')}`
    });
  }

  if (report.talent_pipeline) {
    const observationIds = new Set((report.statistical_observations ?? []).map((observation) => observation.id));
    const pipelineReferences = [
      report.talent_pipeline.graduate_supply,
      report.talent_pipeline.entrants,
      report.talent_pipeline.enrollment,
      report.talent_pipeline.entry_level_opportunities,
      report.talent_pipeline.graduate_to_entry_opportunity_ratio,
      ...Object.values(report.talent_pipeline.workforce_flow ?? {})
    ].filter((reference) => reference !== undefined);

    for (const reference of pipelineReferences) {
      for (const observationId of reference.observation_ids) {
        if (!observationIds.has(observationId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['talent_pipeline'],
            message: `Talent pipeline reference must match a statistical observation in this report: ${observationId}`
          });
        }
      }
    }
  }

  if (report.snapshot) {
    const metricIds = new Set(report.metrics.map((metric) => metric.id));
    for (const indicator of SNAPSHOT_INDICATORS) {
      const metricId = report.snapshot[indicator.key];
      if (!metricId) continue;
      if (!metricIds.has(metricId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['snapshot', indicator.key],
          message: `Snapshot indicator must reference a metric in this report: ${metricId}`
        });
      }
      if (!(indicator.metricIds as readonly string[]).includes(metricId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['snapshot', indicator.key],
          message: `${indicator.label} cannot reference ${metricId}.`
        });
      }
    }
  }
});

const reports = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/reports' }),
  schema: reportSchema
});

export const collections = { reports };

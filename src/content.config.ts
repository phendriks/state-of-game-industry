import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { NEWS_SOURCES } from './data/newsSources';

const registeredSourceNames = new Set(NEWS_SOURCES.map((source) => source.name));

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
  metrics: z.array(metricSchema)
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
});

const reports = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/reports' }),
  schema: reportSchema
});

export const collections = { reports };

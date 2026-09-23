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
  category: z.enum(['Market', 'Players', 'Employment', 'Business', 'Corporate', 'Products']),
  kind: z.enum(['Reported', 'Calculated', 'Forecast', 'Estimate']),
  observed_on: z.coerce.date(),
  source: z.string().refine((source) => registeredSourceNames.has(source), {
    message: 'Metric source must exactly match a source in src/data/newsSources.ts.'
  }),
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

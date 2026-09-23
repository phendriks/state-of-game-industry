import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
  metrics: z.array(z.object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    label: z.string(),
    value: z.number(),
    display_value: z.string(),
    detail: z.string(),
    category: z.enum(['Market', 'Players', 'Employment']),
    kind: z.enum(['Reported', 'Forecast', 'Estimate']),
    observed_on: z.coerce.date(),
    source: z.string(),
    featured: z.boolean().default(false)
  }))
}).superRefine((report, context) => {
  if (report.human_reviewed && !report.reviewer) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reviewer'],
      message: 'A reviewer is required when human_reviewed is true.'
    });
  }
});

const reports = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/reports' }),
  schema: reportSchema
});

export const collections = { reports };

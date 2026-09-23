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
  key_metrics: z.array(z.object({
    label: z.string(),
    value: z.string(),
    detail: z.string(),
    tone: z.enum(['positive', 'negative', 'mixed', 'neutral'])
  })),
  signals: z.array(z.object({
    label: z.string(),
    reading: z.string(),
    evidence: z.string(),
    confidence: z.enum(['High', 'Medium-high', 'Medium', 'Low']),
    tone: z.enum(['positive', 'negative', 'mixed', 'neutral'])
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

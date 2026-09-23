import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const reports = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/reports' }),
  schema: z.object({
    title: z.string(),
    report_id: z.string(),
    published: z.coerce.date(),
    period_start: z.coerce.date(),
    period_end: z.coerce.date(),
    report_type: z.string(),
    history_baseline: z.boolean(),
    ai_generated: z.boolean().default(true),
    human_authorship_claimed: z.boolean().default(false),
    geographic_scope: z.string(),
    global_representativeness: z.string(),
    independently_audited: z.boolean().default(false)
  })
});

export const collections = { reports };

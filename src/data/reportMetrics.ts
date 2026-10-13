import type { CollectionEntry } from 'astro:content';

export const REPORT_METRIC_CATEGORIES = [
  'Market',
  'Players',
  'Employment',
  'Business',
  'Corporate',
  'Products'
] as const;

// Use the report schema's metric type so display code stays in sync with validation.
export type ReportMetric = CollectionEntry<'reports'>['data']['metrics'][number];

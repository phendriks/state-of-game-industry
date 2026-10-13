import type { CollectionEntry } from 'astro:content';
import { STATISTICAL_SOURCES } from './statisticalSources';

export type DashboardMetricStatus = 'available' | 'data-not-found' | 'baseline-not-established';
export type DashboardMetricKind = 'Reported' | 'Forecast' | 'Estimated' | 'Derived' | 'Survey';
export type DashboardMetricCard = {
  id: string;
  label: string;
  value: string;
  secondaryValue?: string;
  source: string;
  sourceUrl?: string;
  geography: string;
  referenceDate: string;
  kind: DashboardMetricKind;
  status: DashboardMetricStatus;
  carriedForward?: boolean;
  missingReason?: string;
};
export type DashboardMetricSection = {
  id: string;
  title: string;
  description: string;
  metrics: DashboardMetricCard[];
};
export type DashboardDataTodo = {
  id: string;
  label: string;
  evidenceNeeded: string;
  nextStep: string;
};

type ReportData = Pick<CollectionEntry<'reports'>['data'], 'metrics' | 'statistical_observations' | 'talent_pipeline'>;

// Shared by the site and the evidence artifact; each slot names its actual measure.
export const DASHBOARD_SECTIONS = [
  {
    id: 'worldwide-market',
    title: 'Players & markets',
    description: 'Global forecasts, US players and European revenue. Dates and coverage differ.',
    metrics: [
      { id: 'global_games_revenue', label: 'Global games revenue' },
      { id: 'global_players', label: 'Global players' },
      { id: 'us_weekly_players', label: 'US weekly players' },
      { id: 'europe_games_revenue', label: 'European games revenue' }
    ]
  },
  {
    id: 'employment-conditions',
    title: 'Employment conditions',
    description: 'Advertised jobs, employer layoff exposure and tracked layoffs.',
    metrics: [
      { id: 'open_roles', label: 'Open positions' },
      { id: 'entry_level_role_share', label: 'Entry-level share' },
      { id: 'gdc_employers_with_layoffs', label: 'Employer layoff exposure' },
      { id: 'confirmed_layoffs_2026', label: 'Tracked 2026 layoffs' }
    ]
  },
  {
    id: 'talent-flow',
    title: 'Talent supply & career outcomes',
    description: 'Education awards and career surveys; no global workforce total.',
    metrics: [
      { id: 'game_specific_graduates', label: 'Game-specific awards', measure: 'annual_game_specific_graduates', reference: 'graduate_supply' },
      { id: 'graduate_entry_by_graduation', label: 'Graduate entry by graduation', measure: 'graduate_entry_by_graduation', reference: 'graduate_entry' },
      { id: 'career_switching_share', label: 'Changed field or industry', measure: 'career_switching_share', reference: 'career_switching' },
      { id: 'post_layoff_joblessness_share', label: 'No new job after layoffs', measure: 'post_layoff_joblessness_share', reference: 'post_layoff_joblessness' }
    ]
  }
] as const;

export const DASHBOARD_METRIC_IDS = [
  ...DASHBOARD_SECTIONS.flatMap(section => section.metrics.filter(item => !('reference' in item)).map(item => item.id)),
  'tracked_studios',
  'entry_level_roles'
];

export const DASHBOARD_DATA_TODOS: DashboardDataTodo[] = [
  { id: 'game_program_entrants', label: 'Game-program student starts', evidenceNeeded: 'Annual entrants from explicitly game-specific programmes.', nextStep: 'Complete reviewed programme mappings for administrative education datasets.' },
  { id: 'workers_entering_games', label: 'Measured workers entering games', evidenceNeeded: 'Observed transitions into identified games employers.', nextStep: 'Investigate longitudinal datasets; graduate placement surveys remain separate.' },
  { id: 'workers_leaving_games', label: 'Measured workers leaving games', evidenceNeeded: 'Observed transitions from games employers to other industries.', nextStep: 'Career-switching surveys cannot establish a worldwide exit count.' },
  { id: 'graduate_entry_ratio', label: 'Graduate-to-entry-opportunity ratio', evidenceNeeded: 'Graduates and unique entry opportunities over matching years and geographies.', nextStep: 'Establish a vacancy-flow series before calculating a ratio.' }
];

const date = (value: Date | string) => new Date(value).toLocaleDateString('en-GB', {
  month: 'short', year: 'numeric', timeZone: 'UTC'
});
const kind = (value: string): DashboardMetricKind => value === 'Estimate' ? 'Estimated'
  : value === 'Calculated' ? 'Derived'
  : value === 'Forecast' || value === 'Survey' || value === 'Derived' ? value : 'Reported';

export function buildDashboardReport(latest: CollectionEntry<'reports'>, baseline?: CollectionEntry<'reports'>): CollectionEntry<'reports'> {
  const merge = <T extends { id: string; carried_forward: boolean }>(current: T[], historical: T[]) => {
    const currentIds = new Set(current.map(item => item.id));
    return [...current, ...historical.filter(item => !currentIds.has(item.id)).map(item => ({ ...item, carried_forward: true }))];
  };
  return {
    ...latest,
    data: {
      ...latest.data,
      metrics: merge(latest.data.metrics, baseline?.data.metrics ?? []),
      statistical_observations: merge(latest.data.statistical_observations ?? [], baseline?.data.statistical_observations ?? []),
      talent_pipeline: {
        ...baseline?.data.talent_pipeline,
        ...latest.data.talent_pipeline,
        workforce_flow: { ...baseline?.data.talent_pipeline?.workforce_flow, ...latest.data.talent_pipeline?.workforce_flow }
      }
    }
  };
}

export function buildDashboardSections(data: ReportData): DashboardMetricSection[] {
  const metrics = new Map(data.metrics.map(item => [item.id, item]));
  const observations = new Map((data.statistical_observations ?? []).map(item => [item.id, item]));
  const sources = new Map(STATISTICAL_SOURCES.map(item => [item.id, item.name]));

  return DASHBOARD_SECTIONS.map(section => ({
    ...section,
    metrics: section.metrics.map(slot => {
      if ('reference' in slot) {
        const reference = data.talent_pipeline?.[slot.reference];
        const item = reference ? observations.get(reference.observation_ids[0]) : undefined;
        if (item) return {
          id: slot.id, label: slot.label, value: item.display_value, secondaryValue: item.detail,
          source: sources.get(item.source_id) ?? item.publisher, sourceUrl: item.source_url,
          geography: item.geography, referenceDate: item.reference_period,
          kind: kind(item.measurement_type ?? (item.transformation ? 'Derived' : 'Reported')),
          status: 'available' as const, carriedForward: item.carried_forward
        };
      } else {
        const item = metrics.get(slot.id);
        if (item) return {
          id: slot.id, label: slot.label, value: item.display_value, secondaryValue: item.detail,
          source: item.source, sourceUrl: item.source_url, geography: item.scope,
          referenceDate: date(item.observed_on), kind: kind(item.kind),
          status: 'available' as const, carriedForward: item.carried_forward
        };
      }
      return {
        id: slot.id, label: slot.label, value: 'N/A', secondaryValue: 'Data not found',
        source: 'No verified observation', geography: 'Not established', referenceDate: 'Not established',
        kind: 'Reported' as const, status: 'data-not-found' as const,
        missingReason: `No verified ${slot.label.toLowerCase()} observation is recorded.`
      };
    })
  }));
}

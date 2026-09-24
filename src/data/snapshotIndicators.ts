export const SNAPSHOT_INDICATORS = [
  {
    key: 'global_games_revenue',
    label: 'Global games revenue',
    metricIds: ['global_games_revenue']
  },
  {
    key: 'global_players',
    label: 'Global players',
    metricIds: ['global_players']
  },
  {
    key: 'global_spenders',
    label: 'Global spenders',
    metricIds: ['global_spenders']
  },
  {
    key: 'new_job_listings',
    label: 'New job listings',
    metricIds: ['new_job_listings', 'new_roles_seven_days']
  },
  {
    key: 'entry_level_role_share',
    label: 'Entry-level role share',
    metricIds: ['entry_level_role_share']
  },
  {
    key: 'mid_level_role_share',
    label: 'Mid-level role share',
    metricIds: ['mid_level_role_share']
  },
  {
    key: 'current_year_layoffs',
    label: 'Current-year layoffs',
    metricIds: ['current_year_layoffs', 'confirmed_layoffs_2026']
  },
  {
    key: 'projected_layoffs',
    label: 'Projected layoffs',
    metricIds: ['projected_layoffs', 'forecast_layoffs_2026']
  }
] as const;

export type SnapshotIndicatorKey = typeof SNAPSHOT_INDICATORS[number]['key'];
export const SNAPSHOT_INDICATOR_KEYS = SNAPSHOT_INDICATORS.map(({ key }) => key);
export type SnapshotMetricReferences = Record<SnapshotIndicatorKey, string>;

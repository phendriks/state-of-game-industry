export const TALENT_SNAPSHOT_INDICATORS = [
  {
    key: 'entrants',
    label: 'Game-program entrants',
    measure: 'game_program_entrants',
    precision: 'game-specific'
  },
  {
    key: 'graduate_supply',
    label: 'Game-specific graduates',
    measure: 'annual_game_specific_graduates',
    precision: 'game-specific'
  },
  {
    key: 'graduate_entry',
    label: 'Graduate entry by graduation',
    measure: 'graduate_entry_by_graduation',
    precision: 'game-specific'
  },
  {
    key: 'career_switching',
    label: 'Changed field or industry',
    measure: 'career_switching_share',
    precision: 'identified-games-workforce'
  },
  {
    key: 'post_layoff_joblessness',
    label: 'No new job after layoffs',
    measure: 'post_layoff_joblessness_share',
    precision: 'identified-games-workforce'
  },
  {
    key: 'workforce_contraction',
    label: 'Games workforce contraction',
    measure: 'workforce_contraction',
    precision: 'identified-games-workforce'
  },
  {
    key: 'industry_outflow',
    label: 'Professional industry outflow',
    measure: 'industry_outflow',
    precision: 'identified-games-workforce'
  },
  {
    key: 'industry_inflow',
    label: 'Workers entering games',
    measure: 'industry_inflow',
    precision: 'identified-games-workforce'
  }
] as const;

export type TalentSnapshotIndicator = typeof TALENT_SNAPSHOT_INDICATORS[number];

// Compute the programme median from stored rates, never from an AI-written headline.
export function graduateEntryMedian(inputs: { value: number }[]): number {
  if (!inputs.length || inputs.some(({ value }) => !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error('Graduate entry inputs must contain programme rates between 0 and 100.');
  }
  const sorted = inputs.map(({ value }) => value).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

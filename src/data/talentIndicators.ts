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
  }
] as const;

export type TalentSnapshotIndicator = typeof TALENT_SNAPSHOT_INDICATORS[number];

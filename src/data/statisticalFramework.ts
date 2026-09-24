export const STATISTICAL_OBSERVATION_PRECISION_CLASSES = [
  'game-specific',
  'game-adjacent',
  'identified-games-workforce',
  'games-adjacent-occupation',
  'broader-technology-creative',
  'sector-proxy',
  'general-context'
] as const;

export type StatisticalObservationPrecision = typeof STATISTICAL_OBSERVATION_PRECISION_CLASSES[number];

export type StatisticalObservation = {
  id: string;
  label: string;
  displayValue: string;
  detail: string;
  sourceId: string;
  publisher: string;
  datasetName: string;
  datasetId?: string;
  tableId?: string;
  sourceUrl: string;
  geography: string;
  referencePeriod: string;
  observedOn: string;
  releaseDate?: string;
  retrievedAt: string;
  revisionStatus: 'provisional' | 'revised' | 'final' | 'unknown';
  classificationSystem?: string;
  classificationVersion?: string;
  classificationCode?: string;
  measure: string;
  originalUnit: string;
  originalValue: number | string;
  queryOrFilters?: string;
  transformation?: string;
  derivedValue?: number;
  methodologyVersion: string;
  precisionClass: StatisticalObservationPrecision;
  coverageNotes: string;
  evidenceExcerpt: string;
  carriedForward: boolean;
  rawFileHash?: string;
};

export const EDUCATION_PRECISION_RULES = [
  {
    id: 'game-specific',
    label: 'Game-specific',
    definition: 'The official programme name or classification explicitly targets games or game development.'
  },
  {
    id: 'game-adjacent',
    label: 'Game-adjacent',
    definition: 'The programme can feed games and other industries, such as computer science, animation, VFX, interactive media or digital art.'
  },
  {
    id: 'general-context',
    label: 'General context',
    definition: 'Broader education data used for context only.'
  }
] as const;

export const WORKFORCE_PRECISION_RULES = [
  {
    id: 'identified-games-workforce',
    label: 'Identified games workforce',
    definition: 'The source directly identifies games employers or workers.'
  },
  {
    id: 'games-adjacent-occupation',
    label: 'Games-adjacent occupation',
    definition: 'The occupation is relevant to games but also common elsewhere.'
  },
  {
    id: 'broader-technology-creative',
    label: 'Broader technology / creative workforce',
    definition: 'The observed population spans games and other technology or creative industries.'
  },
  {
    id: 'sector-proxy',
    label: 'Sector proxy',
    definition: 'The public industry classification is broader than games.'
  },
  {
    id: 'general-context',
    label: 'General context',
    definition: 'The statistic describes the wider labour market only.'
  }
] as const;

export const WORKFORCE_FLOW_TERMS = [
  {
    id: 'employer-separation',
    label: 'Employer separation',
    definition: 'A worker leaves an employer; the destination may be unknown.'
  },
  {
    id: 'intra-games-movement',
    label: 'Intra-games movement',
    definition: 'A worker moves from one identified games employer to another.'
  },
  {
    id: 'industry-inflow',
    label: 'Industry inflow',
    definition: 'A worker moves from a non-games employer into an identified games employer.'
  },
  {
    id: 'industry-outflow',
    label: 'Industry outflow',
    definition: 'A worker moves from an identified games employer to a non-games employer.'
  },
  {
    id: 'non-employment-outflow',
    label: 'Non-employment outflow',
    definition: 'A worker moves from employment into persistent non-employment where the dataset supports this.'
  },
  {
    id: 'workforce-contraction',
    label: 'Workforce contraction',
    definition: 'Total measured employment in the defined games population decreases.'
  },
  {
    id: 'intent-to-leave',
    label: 'Intent to leave',
    definition: 'Survey sentiment only; it is not observed attrition.'
  }
] as const;

export const FUTURE_TALENT_METRICS = [
  {
    id: 'annual_game_specific_graduates',
    label: 'Annual game-specific graduates',
    definition: 'Graduates from classifications explicitly identified as game-specific.'
  },
  {
    id: 'game_program_entrants',
    label: 'Game-program entrants',
    definition: 'New entrants into programmes classified as game-specific.'
  },
  {
    id: 'game_program_enrollment',
    label: 'Education pipeline',
    definition: 'Current enrolment in programmes classified as game-specific.'
  },
  {
    id: 'unique_entry_level_opportunities',
    label: 'Unique entry-level opportunities',
    definition: 'Deduplicated junior games vacancies observed during a stated rolling period.'
  },
  {
    id: 'graduate_to_entry_opportunity_ratio',
    label: 'Graduate-to-entry-opportunity ratio',
    definition: 'Trailing-12-month graduates divided by unique trailing-12-month entry opportunities; not a placement probability or competition rate.'
  }
] as const;

export type EducationProgramClassification = {
  geography: string;
  system: string;
  version: string;
  code: string;
  label: string;
  precision: 'game-specific' | 'game-adjacent';
  rationale: string;
};

// This list is reviewed and versioned rather than inferred during each reporting run.
export const EDUCATION_PROGRAM_CLASSIFICATIONS: EducationProgramClassification[] = [
  {
    geography: 'United States',
    system: 'CIP',
    version: '2020',
    code: '11.0204',
    label: 'Computer Game Programming',
    precision: 'game-specific',
    rationale: 'The official classification explicitly names computer game programming.'
  },
  {
    geography: 'United States',
    system: 'CIP',
    version: '2020',
    code: '50.0411',
    label: 'Game and Interactive Media Design',
    precision: 'game-specific',
    rationale: 'The official classification explicitly names game and interactive media design.'
  }
];

// Dutch programmes will be added only after programme identities have been checked
// against DUO data. An empty list is preferable to reclassifying programmes by AI.
export const DUTCH_GAME_PROGRAM_CLASSIFICATIONS: EducationProgramClassification[] = [];

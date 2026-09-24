export const STATISTICAL_SOURCE_CATEGORIES = [
  'education-pipeline',
  'graduate-outcomes',
  'employment',
  'job-vacancies',
  'workforce-flow',
  'industry-workforce'
] as const;

export const STATISTICAL_SOURCE_TYPES = [
  'administrative',
  'official-statistics',
  'official-survey',
  'sector-survey'
] as const;

export const SOURCE_GAMES_PRECISION = [
  'game-specific',
  'game-adjacent',
  'sector-proxy',
  'general-context'
] as const;

export type StatisticalSource = {
  id: string;
  name: string;
  publisher: string;
  url: string;
  geography: string;
  category: typeof STATISTICAL_SOURCE_CATEGORIES[number];
  sourceType: typeof STATISTICAL_SOURCE_TYPES[number];
  frequency: string;
  gamesPrecision: typeof SOURCE_GAMES_PRECISION[number];
  classificationSystem?: string;
  role: string;
  limitations: string;
  active: boolean;
};

// Canonical registry for statistical and administrative datasets. These sources
// are deliberately separate from the news-source registry used by report collection.
export const STATISTICAL_SOURCES: StatisticalSource[] = [
  {
    id: 'us-nces-ipeds',
    name: 'Integrated Postsecondary Education Data System (IPEDS)',
    publisher: 'US National Center for Education Statistics',
    url: 'https://nces.ed.gov/ipeds/',
    geography: 'United States',
    category: 'education-pipeline',
    sourceType: 'administrative',
    frequency: 'Annual',
    gamesPrecision: 'game-specific',
    classificationSystem: 'CIP',
    role: 'Enrolment and completions by institution, award level and detailed programme code.',
    limitations: 'Game-specific totals must use an explicit, versioned CIP list; adjacent programmes remain separate.',
    active: true
  },
  {
    id: 'us-census-lehd-j2j',
    name: 'LEHD Job-to-Job Flows',
    publisher: 'US Census Bureau',
    url: 'https://lehd.ces.census.gov/data/',
    geography: 'United States',
    category: 'workforce-flow',
    sourceType: 'administrative',
    frequency: 'Quarterly',
    gamesPrecision: 'sector-proxy',
    classificationSystem: 'NAICS',
    role: 'Hires, separations, job-to-job movement and movement into or out of non-employment.',
    limitations: 'Public industry classifications are broader than games and cannot directly measure games-industry outflow.',
    active: true
  },
  {
    id: 'us-bls-oews',
    name: 'Occupational Employment and Wage Statistics',
    publisher: 'US Bureau of Labor Statistics',
    url: 'https://www.bls.gov/oes/',
    geography: 'United States',
    category: 'employment',
    sourceType: 'official-statistics',
    frequency: 'Annual',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'SOC and NAICS',
    role: 'Employment and wages at occupation-by-industry intersections.',
    limitations: 'Games roles and employers are distributed across broader occupation and industry codes.',
    active: true
  },
  {
    id: 'eu-eurostat-uoe',
    name: 'UOE Education and Training Statistics',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/web/education-and-training/database',
    geography: 'European Union / EEA',
    category: 'education-pipeline',
    sourceType: 'official-statistics',
    frequency: 'Annual',
    gamesPrecision: 'general-context',
    classificationSystem: 'ISCED-F',
    role: 'Comparable enrolment and graduate counts by education level and field.',
    limitations: 'Published fields are generally too broad to isolate game-development programmes.',
    active: true
  },
  {
    id: 'eu-eurostat-lfs',
    name: 'European Union Labour Force Survey',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/web/lfs',
    geography: 'European Union / EEA',
    category: 'employment',
    sourceType: 'official-survey',
    frequency: 'Quarterly and annual',
    gamesPrecision: 'sector-proxy',
    classificationSystem: 'NACE and ISCO',
    role: 'Employment, occupation, economic sector, education and labour-market participation.',
    limitations: 'Sample size and broad classifications limit games-specific estimates, especially by country.',
    active: true
  },
  {
    id: 'eu-eurostat-job-vacancies',
    name: 'Job Vacancy Statistics',
    publisher: 'Eurostat',
    url: 'https://ec.europa.eu/eurostat/web/labour-market/database',
    geography: 'European Union / EEA',
    category: 'job-vacancies',
    sourceType: 'official-statistics',
    frequency: 'Quarterly',
    gamesPrecision: 'sector-proxy',
    classificationSystem: 'NACE',
    role: 'Vacancies and occupied posts by economic activity.',
    limitations: 'Economic activities are broader than games and country coverage differs.',
    active: true
  },
  {
    id: 'eu-eurograduate',
    name: 'EUROGRADUATE',
    publisher: 'European Commission / European Higher Education Sector Observatory',
    url: 'https://www.eurograduate.eu/',
    geography: 'Participating European countries',
    category: 'graduate-outcomes',
    sourceType: 'official-survey',
    frequency: 'Periodic',
    gamesPrecision: 'general-context',
    classificationSystem: 'ISCED-F',
    role: 'Employment, qualification matching and graduate outcomes about one and five years after graduation.',
    limitations: 'Participation and field detail vary by round; outcomes are not games-specific.',
    active: true
  },
  {
    id: 'nl-duo-open-onderwijsdata',
    name: 'Open onderwijsdata — hoger onderwijs',
    publisher: 'Dienst Uitvoering Onderwijs (DUO)',
    url: 'https://duo.nl/open_onderwijsdata/hoger-onderwijs/',
    geography: 'Netherlands',
    category: 'education-pipeline',
    sourceType: 'administrative',
    frequency: 'Annual',
    gamesPrecision: 'game-specific',
    classificationSystem: 'CROHO / RIO programme identity',
    role: 'Programme-level entrants, enrolment and graduates across HBO and WO.',
    limitations: 'Game-specific use requires a maintained, reviewed list of programme identities; the list is currently unavailable.',
    active: true
  },
  {
    id: 'nl-cbs-labour-mobility',
    name: 'StatLine labour mobility',
    publisher: 'Statistics Netherlands (CBS)',
    url: 'https://opendata.cbs.nl/statline/',
    geography: 'Netherlands',
    category: 'workforce-flow',
    sourceType: 'official-statistics',
    frequency: 'Quarterly and annual',
    gamesPrecision: 'sector-proxy',
    classificationSystem: 'SBI and ISCO',
    role: 'Employer switching, labour-force entry and exit, occupation and industry context.',
    limitations: 'Public breakdowns normally cannot identify the games workforce directly.',
    active: true
  },
  {
    id: 'uk-hesa-students',
    name: 'Higher Education Student Statistics',
    publisher: 'HESA / Jisc',
    url: 'https://www.hesa.ac.uk/data-and-analysis/students',
    geography: 'United Kingdom',
    category: 'education-pipeline',
    sourceType: 'administrative',
    frequency: 'Annual',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'HECoS / CAH',
    role: 'Entrants, enrolment and qualifiers by provider and subject.',
    limitations: 'Subject groups may mix game-specific and adjacent courses; detailed extracts may have access limits.',
    active: true
  },
  {
    id: 'uk-hesa-graduate-outcomes',
    name: 'Graduate Outcomes',
    publisher: 'HESA / Jisc',
    url: 'https://www.hesa.ac.uk/data-and-analysis/graduates',
    geography: 'United Kingdom',
    category: 'graduate-outcomes',
    sourceType: 'official-survey',
    frequency: 'Annual',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'HECoS / CAH, SOC and SIC',
    role: 'Graduate activity, employment, occupation and further study about 15 months after graduation.',
    limitations: 'A games-related degree does not establish that a graduate works in games; survey response and weighting apply.',
    active: true
  },
  {
    id: 'uk-dfe-leo',
    name: 'Longitudinal Education Outcomes',
    publisher: 'UK Department for Education',
    url: 'https://explore-education-statistics.service.gov.uk/find-statistics/graduate-labour-market-outcomes-leo',
    geography: 'England',
    category: 'graduate-outcomes',
    sourceType: 'administrative',
    frequency: 'Annual',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'HECoS / CAH and SIC',
    role: 'Longitudinal employment and earnings outcomes by subject and provider.',
    limitations: 'Coverage is England and employment after a games-related degree is not automatically games employment.',
    active: true
  },
  {
    id: 'ca-statcan-psis-elmlp',
    name: 'PSIS and Education and Labour Market Longitudinal Platform',
    publisher: 'Statistics Canada',
    url: 'https://www150.statcan.gc.ca/n1/pub/37-20-0001/372000012024002-eng.htm',
    geography: 'Canada',
    category: 'graduate-outcomes',
    sourceType: 'administrative',
    frequency: 'Annual',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'CIP Canada and NAICS',
    role: 'Postsecondary enrolment, graduation, persistence and longitudinal labour outcomes.',
    limitations: 'Public tables may not support a defensible games-only education-to-employment path.',
    active: true
  },
  {
    id: 'ca-statcan-jvws',
    name: 'Job Vacancy and Wage Survey',
    publisher: 'Statistics Canada',
    url: 'https://www23.statcan.gc.ca/imdb/p2SV.pl?Function=getSurvey&SDDS=5217',
    geography: 'Canada',
    category: 'job-vacancies',
    sourceType: 'official-survey',
    frequency: 'Quarterly',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'NOC and NAICS',
    role: 'Vacancies, required education and experience, duration and offered wages.',
    limitations: 'Occupation and industry cells may be suppressed or too broad to identify games vacancies.',
    active: true
  },
  {
    id: 'au-education-he-students',
    name: 'Higher Education Student Data',
    publisher: 'Australian Government Department of Education',
    url: 'https://www.education.gov.au/higher-education-statistics/student-data',
    geography: 'Australia',
    category: 'education-pipeline',
    sourceType: 'administrative',
    frequency: 'Annual',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'ASCED',
    role: 'Enrolment, commencements, completions, attrition and retention by field of education.',
    limitations: 'Published fields do not consistently isolate game-development courses.',
    active: true
  },
  {
    id: 'au-qilt-graduate-outcomes',
    name: 'Graduate Outcomes Survey and GOS-Longitudinal',
    publisher: 'Australian Government Department of Education / QILT',
    url: 'https://www.qilt.edu.au/surveys/graduate-outcomes-survey-(gos)',
    geography: 'Australia',
    category: 'graduate-outcomes',
    sourceType: 'official-survey',
    frequency: 'Annual and periodic longitudinal follow-up',
    gamesPrecision: 'general-context',
    classificationSystem: 'ASCED and ANZSCO',
    role: 'Short- and longer-term graduate employment, salary and further-study outcomes.',
    limitations: 'Public reporting is generally too broad for games-specific graduate destinations.',
    active: true
  },
  {
    id: 'jp-mext-school-basic-survey',
    name: 'School Basic Survey',
    publisher: 'Japan Ministry of Education, Culture, Sports, Science and Technology',
    url: 'https://www.e-stat.go.jp/en/statistics/00400001',
    geography: 'Japan',
    category: 'education-pipeline',
    sourceType: 'official-statistics',
    frequency: 'Annual',
    gamesPrecision: 'general-context',
    classificationSystem: 'MEXT fields and e-Stat classifications',
    role: 'Students, graduates and graduate destinations, including some industry and occupation detail.',
    limitations: 'Game-program classification requires local-language programme research and is currently unavailable.',
    active: true
  },
  {
    id: 'kr-kess-higher-education',
    name: 'Higher Education Statistics',
    publisher: 'Korean Educational Development Institute / KESS',
    url: 'https://kess.kedi.re.kr/eng/',
    geography: 'South Korea',
    category: 'education-pipeline',
    sourceType: 'administrative',
    frequency: 'Annual',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'Korean Standard Classification of Education',
    role: 'Students, entrants, graduates and discontinuation by institution and field.',
    limitations: 'Available classifications may not isolate game programmes without a reviewed programme map.',
    active: true
  },
  {
    id: 'kr-kedi-graduate-employment',
    name: 'Higher Education Graduate Employment Statistics',
    publisher: 'Korean Educational Development Institute / KESS',
    url: 'https://kess.kedi.re.kr/eng/',
    geography: 'South Korea',
    category: 'graduate-outcomes',
    sourceType: 'administrative',
    frequency: 'Annual',
    gamesPrecision: 'game-adjacent',
    classificationSystem: 'Korean education and industry classifications',
    role: 'Graduate employment, industry, income and selected employment transitions.',
    limitations: 'Public English material and games-specific cross-tabulations are limited.',
    active: true
  },
  {
    id: 'kr-kocca-game-white-paper',
    name: 'White Paper on Korean Games',
    publisher: 'Korea Creative Content Agency',
    url: 'https://welcon.kocca.kr/en/support/content-report',
    geography: 'South Korea',
    category: 'industry-workforce',
    sourceType: 'sector-survey',
    frequency: 'Annual',
    gamesPrecision: 'game-specific',
    role: 'Games companies, employment, workforce structure and industry conditions.',
    limitations: 'Definitions, survey coverage and translated release availability must be retained for each edition.',
    active: true
  },
  {
    id: 'kr-kocca-labour-environment',
    name: 'Game Industry Worker Labor Environment Survey',
    publisher: 'Korea Creative Content Agency',
    url: 'https://www.kocca.kr/kocca/bbs/list/B0000147.do?menuNo=204153',
    geography: 'South Korea',
    category: 'industry-workforce',
    sourceType: 'sector-survey',
    frequency: 'Periodic',
    gamesPrecision: 'game-specific',
    role: 'Pay, hours, working conditions, attitudes and workforce conditions.',
    limitations: 'Survey responses and intent measures must not be presented as observed worker outflow.',
    active: true
  },
  {
    id: 'cn-moe-education-statistics',
    name: 'National Education Statistics',
    publisher: 'Ministry of Education of the People’s Republic of China',
    url: 'https://en.moe.gov.cn/documents/statistics/',
    geography: 'China',
    category: 'education-pipeline',
    sourceType: 'official-statistics',
    frequency: 'Annual',
    gamesPrecision: 'general-context',
    classificationSystem: 'Chinese discipline classifications',
    role: 'Entrants, enrolment and graduates by education level and discipline where published.',
    limitations: 'Public tables are broader contextual data unless a defensible games-specific classification is available.',
    active: true
  },
  {
    id: 'cn-nbs-labour',
    name: 'National Data — labour and industry',
    publisher: 'National Bureau of Statistics of China',
    url: 'https://data.stats.gov.cn/english/',
    geography: 'China',
    category: 'employment',
    sourceType: 'official-statistics',
    frequency: 'Monthly and annual',
    gamesPrecision: 'general-context',
    classificationSystem: 'Chinese national industry and occupation classifications',
    role: 'Employment, firms and wages in broader software, IT and cultural-industry contexts.',
    limitations: 'The published categories do not directly measure games employment.',
    active: true
  },
  {
    id: 'intl-ilostat',
    name: 'ILOSTAT',
    publisher: 'International Labour Organization',
    url: 'https://ilostat.ilo.org/data/',
    geography: 'International',
    category: 'employment',
    sourceType: 'official-statistics',
    frequency: 'Varies by indicator and country',
    gamesPrecision: 'general-context',
    classificationSystem: 'ISCO, ISIC and ICSE',
    role: 'Harmonised employment, occupation, industry, education and labour-force indicators.',
    limitations: 'Useful for international context, not games-specific counts; country methods and availability differ.',
    active: true
  },
  {
    id: 'intl-oecd-education',
    name: 'OECD Education at a Glance and Education Database',
    publisher: 'Organisation for Economic Co-operation and Development',
    url: 'https://www.oecd.org/en/publications/education-at-a-glance_19991487.html',
    geography: 'OECD members and partner economies',
    category: 'graduate-outcomes',
    sourceType: 'official-statistics',
    frequency: 'Annual',
    gamesPrecision: 'general-context',
    classificationSystem: 'ISCED and ISCED-F',
    role: 'Comparable graduate fields, education outcomes and labour-market outcomes.',
    limitations: 'Revisions can change historical series and the available fields are not games-specific.',
    active: true
  }
];

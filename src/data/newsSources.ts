export type NewsSource = {
  name: string;
  url: string;
  coverage: string;
  cadence: 'Continuous' | 'Quarterly' | 'Annual' | 'Periodic';
};

export type SourceCategory = {
  id: string;
  name: string;
  description: string;
  sources: NewsSource[];
};

// Canonical source registry. Every reporting run should start from this list.
// Accepted public submissions are added here so collection and disclosure stay in sync.
export const NEWS_SOURCE_CATEGORIES: SourceCategory[] = [
  {
    id: 'employment',
    name: 'Employment & layoffs',
    description: 'Open roles, layoffs, closures and changes to studio employment.',
    sources: [
      { name: 'Gaming Layoffs', url: 'https://gaminglayoffs.com/', coverage: 'Layoff announcements and totals', cadence: 'Continuous' },
      { name: 'ASGC layoffs tracker', url: 'https://layoffs.asgc.gg/', coverage: 'Layoff estimates and confirmed totals', cadence: 'Continuous' },
      { name: 'DevQuest hiring report', url: 'https://devquest.gg/game-industry-hiring-report', coverage: 'Roles, seniority and hiring concentration', cadence: 'Continuous' },
      { name: 'Game Developer layoffs & closures', url: 'https://www.gamedeveloper.com/keyword/layoffs', coverage: 'Reported layoffs, closures and restructuring', cadence: 'Continuous' },
      { name: 'Xbox Wire', url: 'https://news.xbox.com/', coverage: 'Official Xbox employment and corporate announcements', cadence: 'Continuous' },
      { name: 'Insomniac careers', url: 'https://job-boards.greenhouse.io/insomniac', coverage: 'First-party studio vacancies', cadence: 'Continuous' },
      { name: 'US WARN guidance', url: 'https://www.dol.gov/agencies/eta/layoffs/employers', coverage: 'Rules and state contacts for qualifying mass-layoff notices; no national dataset', cadence: 'Continuous' },
      { name: 'US foreign labor performance data', url: 'https://www.dol.gov/agencies/eta/foreign-labor/performance', coverage: 'Quarterly LCA and permanent-labour application records, wages and worksites', cadence: 'Quarterly' }
    ]
  },
  {
    id: 'professional',
    name: 'Professional sentiment',
    description: 'Recurring surveys of developers and other industry professionals.',
    sources: [
      { name: 'GDC State of the Game Industry', url: 'https://gdconf.com/article/gdc-2026-state-of-the-game-industry-reveals-impact-of-layoffs-generative-ai-and-more/', coverage: 'Developer sentiment and working conditions', cadence: 'Annual' },
      { name: 'IGDA Developer Satisfaction Survey', url: 'https://igda.org/dss/', coverage: 'Career, workplace and demographic signals', cadence: 'Periodic' }
    ]
  },
  {
    id: 'consumer',
    name: 'Player activity & reception',
    description: 'Direct platform activity, player discussion, user reviews and professional review aggregates.',
    sources: [
      { name: 'Steam player statistics', url: 'https://store.steampowered.com/stats/stats/', coverage: 'Concurrent Steam users and game-level player counts', cadence: 'Continuous' },
      { name: 'Twitch API', url: 'https://dev.twitch.tv/docs/api/reference', coverage: 'Live game-category viewers, streams and languages', cadence: 'Continuous' },
      { name: 'Reddit gaming communities', url: 'https://www.reddit.com/r/gaming/', coverage: 'Community discussion and consumer sentiment', cadence: 'Continuous' },
      { name: 'Steam user reviews', url: 'https://store.steampowered.com/', coverage: 'Verified-platform user reception', cadence: 'Continuous' },
      { name: 'Metacritic', url: 'https://www.metacritic.com/game/', coverage: 'Critic and user review aggregates', cadence: 'Continuous' },
      { name: 'OpenCritic', url: 'https://opencritic.com/', coverage: 'Critic review aggregates', cadence: 'Continuous' }
    ]
  },
  {
    id: 'commercial',
    name: 'Commercial performance',
    description: 'Official sales disclosures and clearly labelled third-party estimates.',
    sources: [
      { name: 'VG Insights', url: 'https://vginsights.com/', coverage: 'PC-game market estimates', cadence: 'Continuous' },
      { name: 'Sensor Tower', url: 'https://sensortower.com/', coverage: 'Mobile and digital-market estimates', cadence: 'Continuous' },
      { name: 'Gamalytic', url: 'https://gamalytic.com/', coverage: 'Steam sales and market estimates', cadence: 'Continuous' }
    ]
  },
  {
    id: 'corporate',
    name: 'Corporate & financial',
    description: 'Primary filings and market data used to track company health.',
    sources: [
      { name: 'Microsoft Investor Relations', url: 'https://www.microsoft.com/en-us/Investor', coverage: 'Xbox revenue and Microsoft earnings', cadence: 'Quarterly' },
      { name: 'Ubisoft Investor Center', url: 'https://www.ubisoft.com/en-us/company/about-us/investors', coverage: 'Bookings, guidance and corporate announcements', cadence: 'Quarterly' },
      { name: 'Electronic Arts Investor Relations', url: 'https://investor.ea.com/', coverage: 'Bookings, guidance and corporate announcements', cadence: 'Quarterly' },
      { name: 'Capcom Investor Relations', url: 'https://www.capcom.co.jp/ir/english/', coverage: 'Sales, earnings and product disclosures', cadence: 'Quarterly' },
      { name: 'Square Enix Investor Relations', url: 'https://www.hd.square-enix.com/eng/ir/', coverage: 'Segment sales, earnings and guidance', cadence: 'Quarterly' },
      { name: 'Nintendo Investor Relations', url: 'https://www.nintendo.co.jp/ir/en/', coverage: 'Hardware, software and financial results', cadence: 'Quarterly' },
      { name: 'Take-Two Investor Relations', url: 'https://www.take2games.com/ir', coverage: 'Bookings, guidance and corporate announcements', cadence: 'Quarterly' },
      { name: 'SEC EDGAR', url: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces', coverage: 'US public-company filings and standardized XBRL facts', cadence: 'Continuous' },
      { name: 'Companies House API', url: 'https://developer.company-information.service.gov.uk/', coverage: 'UK company incorporations, dissolutions and legal status', cadence: 'Continuous' },
      { name: 'Eurostat business demography', url: 'https://ec.europa.eu/eurostat/en/web/business-demography', coverage: 'European enterprise births, deaths, survival and employment', cadence: 'Annual' },
      { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/', coverage: 'Market prices and company-level market data', cadence: 'Continuous' }
    ]
  },
  {
    id: 'macro',
    name: 'Macro & capital',
    description: 'Market-size, investment and strategy research for slower-moving context.',
    sources: [
      { name: 'Newzoo', url: 'https://newzoo.com/insights', coverage: 'Global market size and player estimates', cadence: 'Periodic' },
      { name: 'BCG', url: 'https://www.bcg.com/industries/technology-media-telecommunications/gaming', coverage: 'Consumer and games-market research', cadence: 'Periodic' },
      { name: 'Bain & Company', url: 'https://www.bain.com/industry-expertise/media-and-entertainment/video-games/', coverage: 'Games-market and strategy research', cadence: 'Periodic' },
      { name: 'Drake Star', url: 'https://www.drakestar.com/news/global-gaming-report', coverage: 'Games investment and M&A', cadence: 'Quarterly' }
    ]
  }
];

export const NEWS_SOURCES = NEWS_SOURCE_CATEGORIES.flatMap((category) =>
  category.sources.map((source) => ({ ...source, category: category.id }))
);

export type NewsSource = {
  name: string;
  url: string;
  coverage?: string;
  cadence?: 'Continuous' | 'Quarterly' | 'Annual' | 'Periodic';
  type?: 'First-party / company' | 'Government / regulator' | 'Financial filing' | 'Games media' | 'Research / survey' | 'Market estimate' | 'Tracker / database' | 'Platform data' | 'Trade body' | 'Consultancy' | 'Community' | 'Other';
  language?: string;
  geographic_focus?: string;
  notes?: string;
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
      { name: 'IGDA Developer Satisfaction Survey', url: 'https://igda.org/dss/', coverage: 'Career, workplace and demographic signals', cadence: 'Periodic' },
      { name: 'Unity Game Development Report', url: 'https://unity.com/resources/gaming-report', coverage: 'Developer surveys and aggregated Unity ecosystem activity', cadence: 'Annual', type: 'First-party / company', language: 'English', geographic_focus: 'Global', notes: 'First-party Unity platform data combined with developer surveys; retain each sample definition.' },
      { name: 'Perforce State of Real-Time Workflows', url: 'https://www.perforce.com/resources/vcs/state-of-real-time-workflows', coverage: 'Tools, workflows, AI use and workforce concerns across real-time technology users', cadence: 'Annual', type: 'Research / survey', language: 'English', geographic_focus: 'Global', notes: 'The respondent population extends beyond games and must not be presented as games-only.' },
      { name: 'Skillsearch Games & Immersive Survey', url: 'https://www.skillsearch.com/assets/reports/skillsearch_games_and_immersive_salary_and_satisfaction_report_2026.pdf', coverage: 'Pay, benefits, mobility and job satisfaction among games and immersive professionals', cadence: 'Annual', type: 'Research / survey', language: 'English', geographic_focus: 'Global' },
      { name: 'Ukie Workforce Demographics Survey', url: 'https://ukie.org.uk/raise-the-game', coverage: 'Roles, demographics, job losses and working experiences in the UK games workforce', cadence: 'Periodic', type: 'Trade body', language: 'English', geographic_focus: 'United Kingdom', notes: 'Trade-body publication; survey work may be produced with external research partners.' },
      { name: 'Take This industry research', url: 'https://www.takethis.org/2026/03/research-report-take-this-2025-mental-health-in-the-games-industry/', coverage: 'Mental health, burnout, workplace stressors and support in game development', cadence: 'Periodic', type: 'Research / survey', language: 'English', geographic_focus: 'Primarily North America' }
    ]
  },
  {
    id: 'consumer',
    name: 'Player activity & reception',
    description: 'Direct platform activity, player discussion, user reviews and professional review aggregates.',
    sources: [
      { name: 'Steam player statistics', url: 'https://store.steampowered.com/stats/stats/', coverage: 'Concurrent Steam users and game-level player counts', cadence: 'Continuous', type: 'Platform data', language: 'English', geographic_focus: 'Global Steam platform', notes: 'First-party platform activity; it does not represent all PC or console play.' },
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
      { name: 'Gamalytic', url: 'https://gamalytic.com/', coverage: 'Steam sales and market estimates', cadence: 'Continuous' },
      { name: 'Circana Games', url: 'https://www.circana.com/industries/video-games', coverage: 'US consumer spending, hardware, content and accessories data', cadence: 'Continuous', type: 'Tracker / database', language: 'English', geographic_focus: 'United States', notes: 'Public releases expose selected figures from a larger commercial dataset.' },
      { name: 'Ampere Games', url: 'https://www.ampereanalysis.com/products/?sub=games', coverage: 'Global games markets, consumers, titles and platform research', cadence: 'Periodic', type: 'Market estimate', language: 'English', geographic_focus: 'Global' },
      { name: 'AppMagic', url: 'https://appmagic.rocks/', coverage: 'Mobile game downloads, revenue estimates and market reports', cadence: 'Continuous', type: 'Market estimate', language: 'English', geographic_focus: 'Global mobile market' },
      { name: 'Alinea Analytics', url: 'https://alineaanalytics.com/', coverage: 'PC and console sales, revenue and engagement estimates', cadence: 'Continuous', type: 'Market estimate', language: 'English', geographic_focus: 'Global', notes: 'Modeled estimates must remain separate from publisher or platform disclosures.' },
      { name: 'Video Games Europe Games Sales Data', url: 'https://www.videogameseurope.eu/data-key-facts/games-sales-data/', coverage: 'Physical and digital game sales charts across EMEA and APAC territories', cadence: 'Continuous', type: 'Trade body', language: 'English', geographic_focus: 'EMEA and APAC', notes: 'Publisher participation and platform coverage vary; preserve the published territory and channel scope.' },
      { name: 'Famitsu Game White Paper', url: 'https://group.kadokawa.co.jp/information/promotional_topics/article-15406.html', coverage: 'Japanese and international market size, players, platforms and consumer behaviour', cadence: 'Annual', type: 'Research / survey', language: 'Japanese', geographic_focus: 'Japan with international comparisons', notes: 'KADOKAWA ASCII Research publication; much of the complete dataset is paid, while headline observations are public.' }
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
      { name: 'Sony Group Investor Relations', url: 'https://www.sony.com/en/SonyInfo/IR/', coverage: 'PlayStation users, engagement, hardware, software and segment financial results', cadence: 'Quarterly', type: 'First-party / company', language: 'English and Japanese', geographic_focus: 'Global' },
      { name: 'Tencent Investor Relations', url: 'https://www.tencent.com/investors/', coverage: 'Domestic and international games revenue and group financial results', cadence: 'Quarterly', type: 'First-party / company', language: 'English and Chinese', geographic_focus: 'China and global' },
      { name: 'NetEase Investor Relations', url: 'https://ir.netease.com/', coverage: 'Online-games revenue, product performance and group financial results', cadence: 'Quarterly', type: 'First-party / company', language: 'English and Chinese', geographic_focus: 'China and global' },
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
      { name: 'Drake Star', url: 'https://www.drakestar.com/news/global-gaming-report', coverage: 'Games investment and M&A', cadence: 'Quarterly' },
      { name: 'PwC Global Entertainment & Media Outlook', url: 'https://www.pwc.com/gx/en/industries/entertainment-media/outlook.html', coverage: 'Country-level entertainment, video-games and esports revenue history and forecasts', cadence: 'Annual', type: 'Consultancy', language: 'English with regional editions', geographic_focus: 'Global', notes: 'Forecast definitions differ from games-only market reports and must remain separate.' },
      { name: 'Deloitte Digital Media Trends', url: 'https://www.deloitte.com/us/en/insights/industry/technology/digital-media-trends-consumption-habits-survey.html', coverage: 'Consumer media, gaming, subscriptions and attention research', cadence: 'Annual', type: 'Research / survey', language: 'English', geographic_focus: 'United States' },
      { name: 'Niko Partners market reports', url: 'https://nikopartners.com/reports/', coverage: 'Games markets and player research across Asia and MENA', cadence: 'Periodic', type: 'Market estimate', language: 'English with local-language research inputs', geographic_focus: 'Asia and MENA', notes: 'Research combines local-language tracking, surveys and market modeling.' },
      { name: 'Video Games Europe & EGDF Key Facts', url: 'https://www.videogameseurope.eu/data-key-facts/', coverage: 'European players, revenue, employment and company statistics', cadence: 'Annual', type: 'Trade body', language: 'English', geographic_focus: 'Europe' },
      { name: 'InvestGame reports', url: 'https://investgame.net/news/category/report/', coverage: 'Games investment, funding, M&A and public-market activity', cadence: 'Quarterly', type: 'Tracker / database', language: 'English', geographic_focus: 'Global', notes: 'Some market updates are produced with Aream & Co.; preserve the named origin for each observation.' },
      { name: 'ESA Essential Facts', url: 'https://www.theesa.com/resources/essential-facts-about-the-us-video-game-industry/2026-data/', coverage: 'US player population, behaviour, demographics and spending', cadence: 'Annual', type: 'Trade body', language: 'English', geographic_focus: 'United States', notes: 'Trade-body publication based on commissioned consumer research; record the research partner as origin where relevant.' }
    ]
  }
];

export const NEWS_SOURCES = NEWS_SOURCE_CATEGORIES.flatMap((category) =>
  category.sources.map((source) => ({ ...source, category: category.id }))
);

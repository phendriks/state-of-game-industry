export type DashboardMetricStatus = 'available' | 'data-not-found' | 'baseline-not-established';
export type DashboardMetricKind = 'Reported' | 'Forecast' | 'Estimated' | 'Derived';
export type DashboardMetricCard = { id:string; label:string; value:string; secondaryValue?:string; source:string; sourceUrl?:string; geography:string; referenceDate:string; kind:DashboardMetricKind; status:DashboardMetricStatus; missingReason?:string };
export type DashboardMetricSection = { id:string; title:string; description:string; metrics:DashboardMetricCard[] };
export type DashboardDataTodo = { id:string; label:string; evidenceNeeded:string; nextStep:string };
type Metric = { id:string; value:number; display_value:string; detail:string; scope:string; kind:string; source:string; source_url?:string; observed_on:Date|string };
type Observation = { id:string; display_value:string; detail:string; source_id:string; source_url:string; geography:string; reference_period:string };
type Reference = { observation_ids:string[] };
type ReportData = { metrics?:Metric[]; statistical_observations?:Observation[]; talent_pipeline?:{ graduate_supply?:Reference; graduate_to_entry_opportunity_ratio?:Reference; workforce_flow?:{ industry_inflow?:Reference; industry_outflow?:Reference } } };

export const DASHBOARD_METRIC_IDS = ['global_games_revenue','global_players','global_spenders','open_roles','tracked_studios','entry_level_role_share','entry_level_roles','hiring_concentration_top_20','confirmed_layoffs_2026'] as const;
export const DASHBOARD_DATA_TODOS:DashboardDataTodo[] = [
  {
    id:'game_program_entrants',
    label:'Game-program student starts',
    evidenceNeeded:'Annual entrants from a reviewed list of explicitly game-specific programmes.',
    nextStep:'Complete versioned programme mappings for administrative education datasets before collecting totals.'
  },
  {
    id:'workers_entering_games',
    label:'Workers entering games',
    evidenceNeeded:'Observed moves from education, non-employment or non-games employers into identified games employers.',
    nextStep:'Find a longitudinal employer or worker dataset that identifies games employers without relying on broad-sector proxies.'
  },
  {
    id:'workers_leaving_games',
    label:'Workers leaving games',
    evidenceNeeded:'Observed moves from identified games employers to non-games employers or persistent non-employment.',
    nextStep:'Keep layoffs and intent-to-leave surveys separate while investigating linked workforce-flow data.'
  },
  {
    id:'graduate_entry_ratio',
    label:'Graduate-to-entry-opportunity ratio',
    evidenceNeeded:'Game-specific graduates and deduplicated entry-level opportunities measured over the same trailing 12 months and geography.',
    nextStep:'Establish a vacancy-flow series before calculating the ratio; do not use a point-in-time open-job count.'
  }
];
const date = (value?:Date|string) => value ? new Date(value).toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}) : 'Not established';
const kind = (value:string):DashboardMetricKind => value==='Forecast'?'Forecast':value==='Estimate'?'Estimated':value==='Calculated'?'Derived':'Reported';
const todoIds=new Set(DASHBOARD_DATA_TODOS.map(item=>item.id));
const missing = (id:string,label:string,status:DashboardMetricStatus,reason:string):DashboardMetricCard => ({id,label,value:'N/A',secondaryValue:status==='data-not-found'?'Data not found':'Baseline not established',source:todoIds.has(id)?'Research todo':'No verified observation',geography:'Not established',referenceDate:'Not established',kind:'Reported',status,missingReason:reason});

export function buildDashboardSections(data:ReportData):DashboardMetricSection[] {
  const metrics = new Map((data.metrics??[]).map(item=>[item.id,item]));
  const observations = new Map((data.statistical_observations??[]).map(item=>[item.id,item]));
  const metric = (id:string,label:string,secondaryValue?:string):DashboardMetricCard => {
    const item=metrics.get(id);
    return item ? {id,label,value:item.display_value,secondaryValue:secondaryValue??item.detail,source:item.source,sourceUrl:item.source_url,geography:item.scope.toLowerCase().startsWith('global')?'Global':item.scope,referenceDate:date(item.observed_on),kind:kind(item.kind),status:'available'} : missing(id,label,'data-not-found',`No verified ${label.toLowerCase()} observation is recorded.`);
  };
  const observation = (id:string,label:string,reference:Reference|undefined,reason:string):DashboardMetricCard => {
    const item=reference?observations.get(reference.observation_ids[0]):undefined;
    return item ? {id,label,value:item.display_value,secondaryValue:item.detail,source:item.source_id,sourceUrl:item.source_url,geography:item.geography,referenceDate:item.reference_period,kind:'Reported',status:'available'} : missing(id,label,'data-not-found',reason);
  };
  const players=metrics.get('global_players'), spenders=metrics.get('global_spenders');
  const payingShare:DashboardMetricCard = players&&spenders&&players.value>0 ? {id:'paying_player_share',label:'Paying-player share',value:`${((spenders.value/players.value)*100).toFixed(1)}%`,secondaryValue:`${spenders.display_value} spenders / ${players.display_value} players`,source:`Derived from ${players.source}`,sourceUrl:players.source_url,geography:'Global',referenceDate:date(players.observed_on),kind:'Derived',status:'available'} : missing('paying_player_share','Paying-player share','data-not-found','Global player and spender observations are both required.');
  const studios=metrics.get('tracked_studios'), entry=metrics.get('entry_level_roles'), talent=data.talent_pipeline;
  return [
    {id:'worldwide-market',title:'Worldwide players & market',description:'Global market forecasts and the relationship between the estimated player and spender populations.',metrics:[metric('global_games_revenue','Global games revenue'),metric('global_players','Global players'),metric('global_spenders','Global spenders'),payingShare]},
    {id:'employment-conditions',title:'Employment conditions',description:'DevQuest tracked vacancies and ASGC tracked layoff announcements. Neither dataset is a census of the global games workforce.',metrics:[metric('open_roles','Open positions',studios?`Across ${studios.display_value} studios`:undefined),metric('entry_level_role_share','Entry-level share',entry?`${entry.display_value} positions`:undefined),metric('hiring_concentration_top_20','Hiring concentration'),metric('confirmed_layoffs_2026','Tracked 2026 layoffs')]},
    {id:'talent-flow',title:'Talent pipeline & workforce flow',description:'Verified game-specific education and identified-games-workforce flows only. Missing values remain visible rather than being estimated.',metrics:[observation('game_specific_graduates','Game-specific graduates',talent?.graduate_supply,'No verified game-specific graduate observation is recorded.'),observation('workers_entering_games','Workers entering games',talent?.workforce_flow?.industry_inflow,'No verified identified-games-workforce inflow observation is recorded.'),observation('workers_leaving_games','Workers leaving games',talent?.workforce_flow?.industry_outflow,'No verified identified-games-workforce outflow observation is recorded.'),talent?.graduate_to_entry_opportunity_ratio?observation('graduate_entry_ratio','Graduate-to-entry-opportunity ratio',talent.graduate_to_entry_opportunity_ratio,'No matching flow observation is recorded.'):missing('graduate_entry_ratio','Graduate-to-entry-opportunity ratio','baseline-not-established','Requires matching trailing-12-month graduate and unique entry-level opportunity flows.')]}
  ];
}

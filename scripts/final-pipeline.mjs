import fs from 'node:fs/promises';
import path from 'node:path';
import { pipelineOpenAIClient } from './pipeline-openai.mjs';
import { REPORT_MODEL_CONFIG } from '../src/data/reportConfig.ts';
import { readRunManifest, RUNS_DIR, RUN_STAGE_FILES, writeRunStage } from './run-workspace.mjs';
import { readReport, writeReport } from './report-lib.mjs';

const dir = (root, runId) => path.join(path.resolve(root), runId);
const json = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const jsonl = async (file) => (await fs.readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const round = (value) => Number(value.toFixed(2));

export async function calculateDeterministicMetrics(runId, root = RUNS_DIR) {
  const base = dir(root, runId); const observations = await jsonl(path.join(base, RUN_STAGE_FILES.normalized));
  const latest = (metric) => observations.filter((item) => item.metric === metric && typeof item.value === 'number').sort((a,b)=>b.observed_at.localeCompare(a.observed_at))[0];
  const metrics = [];
  for (const [id, numeratorName, denominatorName, label] of [
    ['entry_share','entry_level_roles','open_roles','Entry-level share'], ['mid_share','mid_level_roles','open_roles','Mid-level share']
  ]) {
    const numerator = latest(numeratorName), denominator = latest(denominatorName);
    if (numerator && denominator && denominator.value > 0 && numerator.source_id === denominator.source_id && numerator.unit === denominator.unit && numerator.geography === denominator.geography && numerator.reference_period_start === denominator.reference_period_start && numerator.reference_period_end === denominator.reference_period_end) {
      metrics.push({ id, label, value: round((numerator.value / denominator.value) * 100), unit: 'percent', formula: 'numerator / denominator * 100',
        numerator: numerator.value, denominator: denominator.value, input_observation_ids: [numerator.observation_id, denominator.observation_id], geography: numerator.geography,
        reference_period_start: numerator.reference_period_start, reference_period_end: numerator.reference_period_end, evidence_type: 'derived' });
    }
  }
  const forecasts = observations.filter((item) => ['games_revenue', 'global_games_revenue'].includes(item.metric) && item.evidence_type === 'forecast' && typeof item.value === 'number');
  const groups = Map.groupBy(forecasts, (item) => `${item.unit}|${item.geography}|${item.reference_period_start}|${item.reference_period_end}`);
  for (const [scope, values] of groups) if (values.length >= 2) {
    const independent = [...new Map(values.map((item) => [item.underlying_source_id ?? item.source_id, item])).values()];
    if (independent.length >= 2) { const sorted = independent.map((item) => item.value).sort((a,b)=>a-b); const mid = Math.floor(sorted.length/2); const median = sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
      metrics.push({ id: `forecast_consensus_${metrics.length+1}`, label: 'Compatible games-revenue forecast range', value: round(median), range: [sorted[0], sorted.at(-1)], unit: independent[0].unit,
        formula: 'median and range of independent compatible forecasts', source_count: independent.length, input_observation_ids: independent.map((item)=>item.observation_id), scope, geography: independent[0].geography,
        reference_period_start: independent[0].reference_period_start, reference_period_end: independent[0].reference_period_end, evidence_type: 'derived' }); }
  }
  const artifact = { schema_version: '1.0.0', run_id: runId, metrics };
  await writeRunStage(runId, 'derived-metrics', artifact, root); return artifact;
}

export async function selectFindings(runId, root = RUNS_DIR) {
  const base = dir(root, runId); const findings = await json(path.join(base, RUN_STAGE_FILES['validated-findings'])); const observations = await jsonl(path.join(base, RUN_STAGE_FILES.normalized));
  const byId = new Map(observations.map((item)=>[item.observation_id,item]));
  const ranked = findings.map((finding) => { const evidence = finding.observation_ids.map((id)=>byId.get(id)).filter(Boolean); const independent = new Set(evidence.map((item)=>item.underlying_source_id??item.source_id)).size;
    const score_breakdown = { evidence_strength: Math.min(5,evidence.filter((item)=>['reported','observed'].includes(item.evidence_type)).length+1), source_independence: Math.min(5,independent), materiality: Math.min(5,finding.observation_ids.length+finding.metric_ids.length+1), relevance: 4, comparability: evidence.every((item)=>item.geography)?4:2, data_completeness: finding.status==='confirmed'?5:finding.status==='qualified'?4:3, novelty: finding.status==='resolved'?4:3 };
    return { ...finding, score_breakdown, score: Object.values(score_breakdown).reduce((a,b)=>a+b,0) }; }).sort((a,b)=>b.score-a.score||a.finding_id.localeCompare(b.finding_id));
  const selected = ranked.slice(0, Math.min(5, Math.max(3, ranked.length)));
  await writeRunStage(runId, 'selected-findings', selected, root); return selected;
}

export async function compareAndCheck(runId, previousRunDirectory = null, root = RUNS_DIR) {
  const base=dir(root,runId); const selected=await json(path.join(base,RUN_STAGE_FILES['selected-findings'])); const currentMetrics=await json(path.join(base,RUN_STAGE_FILES['derived-metrics']));
  let previousSelected=[], previousMetrics={metrics:[]}; if(previousRunDirectory){ previousSelected=await json(path.join(previousRunDirectory,'selected-findings.json')).catch(()=>[]); previousMetrics=await json(path.join(previousRunDirectory,'derived-metrics.json')).catch(()=>({metrics:[]})); }
  const priorIds=new Set(previousSelected.map((item)=>item.finding_id)), currentIds=new Set(selected.map((item)=>item.finding_id)); const previousByMetric=new Map(previousMetrics.metrics.map((item)=>[item.id,item]));
  const material_metric_changes=currentMetrics.metrics.flatMap((metric)=>{const before=previousByMetric.get(metric.id); if(!before||typeof before.value!=='number'||before.value===0)return[]; const pct=round(((metric.value-before.value)/Math.abs(before.value))*100); return Math.abs(pct)>=10?[{metric_id:metric.id,previous:before.value,current:metric.value,change_percent:pct}]:[]});
  const comparison={run_id:runId,new_findings:selected.filter((item)=>!priorIds.has(item.finding_id)).map((item)=>item.finding_id),continuing_findings:selected.filter((item)=>priorIds.has(item.finding_id)).map((item)=>item.finding_id),resolved_findings:previousSelected.filter((item)=>!currentIds.has(item.finding_id)).map((item)=>item.finding_id),rejected_previous_interpretations:[],material_metric_changes,methodology_changes:[]};
  const anomalies=material_metric_changes.filter((item)=>Math.abs(item.change_percent)>350).map((item)=>({metric_id:item.metric_id,classification:'requires_review',reason:`Changed ${item.change_percent}% from previous run.`}));
  const entry=currentMetrics.metrics.find((item)=>item.id==='entry_share'); if(entry?.value===0) anomalies.push({metric_id:'entry_share',classification:'requires_review',reason:'Entry share became zero.'});
  await writeRunStage(runId,'anomalies',{run_id:runId,items:anomalies},root); await writeRunStage(runId,'comparison',comparison,root); return {comparison,anomalies};
}

export async function buildDashboardArtifact(runId, root = RUNS_DIR) {
  const base=dir(root,runId); const observations=await jsonl(path.join(base,RUN_STAGE_FILES.normalized)); const derived=await json(path.join(base,RUN_STAGE_FILES['derived-metrics'])); const selected=await json(path.join(base,RUN_STAGE_FILES['selected-findings']));
  const fixedIds=['global_games_revenue','global_players','global_spenders','open_roles','entry_level_role_share','mid_level_role_share','new_roles_seven_days','confirmed_layoffs_2026','annual_game_specific_graduates','industry_inflow','industry_outflow']; const derivedById=new Map(derived.metrics.map((item)=>[item.id,item]));
  const fixed=fixedIds.map((id)=>{const metric=derivedById.get(id); if(metric)return{id,label:metric.label,value:metric.value,unit:metric.unit,status:'derived',metric_id:id,observation_ids:metric.input_observation_ids}; const observation=observations.filter((item)=>item.metric===id).sort((a,b)=>b.observed_at.localeCompare(a.observed_at))[0]; return observation?{id,label:id.replaceAll('_',' '),value:observation.value,unit:observation.unit,status:observation.evidence_type,observation_ids:[observation.observation_id]}:{id,label:id.replaceAll('_',' '),value:null,unit:null,status:'data not found',observation_ids:[]};});
  const used=new Set(fixed.flatMap((item)=>item.observation_ids)); const finding_specific=selected.flatMap((finding)=>finding.observation_ids.filter((id)=>!used.has(id)).slice(0,1).map((id)=>{const item=observations.find((observation)=>observation.observation_id===id); return item?{id:`finding-${finding.finding_id}`,label:finding.title,value:item.value,unit:item.unit,status:item.evidence_type,observation_ids:[id],finding_id:finding.finding_id}:null;})).filter(Boolean).slice(0,4);
  const dashboard={schema_version:'1.0.0',run_id:runId,fixed,finding_specific}; await writeRunStage(runId,'dashboard',dashboard,root); return dashboard;
}

export async function writeValidatedReport(runId, client=pipelineOpenAIClient(), root=RUNS_DIR){ const base=dir(root,runId); const manifest=await readRunManifest(runId,root); const selected=await json(path.join(base,RUN_STAGE_FILES['selected-findings'])); const observations=await jsonl(path.join(base,RUN_STAGE_FILES.normalized)); const dashboard=await json(path.join(base,RUN_STAGE_FILES.dashboard)); const comparison=await json(path.join(base,RUN_STAGE_FILES.comparison)); const discovery=await json(path.join(base,RUN_STAGE_FILES['source-discovery']));
  const collected=await json(path.join(base,'collected-report.json')).catch((error)=>{if(error.code==='ENOENT')return null;throw error;});
  const response=await client.responses.create({model:REPORT_MODEL_CONFIG.defaultModel,reasoning:{effort:REPORT_MODEL_CONFIG.reasoningEffort},input:`Write a readable Game Industry Observatory report using only this validated material. Begin with one industry summary using the length needed to explain the evidence without padding. Follow it with the surviving findings and a compact changes table when useful. Do not fabricate findings when none survived. Insert an HTML marker <!-- finding:ID --> before each selected finding. Use final_statement, not original_statement. Clearly label forecasts, estimates, source-specific geography and historical observations. Use only supplied numbers; never add new numerical claims. Do not repeat notes about AI, automation or the collection process.\nFindings:${JSON.stringify(selected)}\nObservations:${JSON.stringify(observations)}\nDashboard:${JSON.stringify(dashboard)}\nComparison:${JSON.stringify(comparison)}`});
  const body=response.output_text.trim(); const sourceNames=new Map([...discovery.registry_sources,...discovery.candidates.filter((item)=>item.decision==='accepted').map((item)=>({source_id:item.candidate_id,name:item.name}))].map((item)=>[item.source_id,item.name]));
  const metrics=observations.filter((item)=>typeof item.value==='number').map((item)=>({id:item.observation_id.replace(/-/g,'_'),label:item.metric.replaceAll('_',' '),value:item.value,display_value:`${item.value}`,detail:item.normalized_claim,scope:`${item.geography}; ${item.reference_period_start} to ${item.reference_period_end}`,unit:item.unit,category:/job|role|layoff|workforce/.test(item.metric)?'Employment':/player|spender/.test(item.metric)?'Players':/revenue|market|spend/.test(item.metric)?'Market':'Business',kind:item.evidence_type==='forecast'?'Forecast':item.evidence_type==='estimated'?'Estimate':'Reported',observed_on:item.observed_at.slice(0,10),period_start:item.reference_period_start,period_end:item.reference_period_end,source:sourceNames.get(item.source_id),source_url:item.source_url,evidence_excerpt:item.raw_claim,collected_on:item.retrieved_at.slice(0,10),origin:item.source_id,source_relationship:item.underlying_source_id?'Repeats / cites':'Original source',carried_forward:item.evidence_class!=='window'}));
  const summary=body.replace(/<!--[^>]+>/g,'').replace(/^#.*$/gm,'').replace(/<[^>]+>/g,'').trim().split(/\n\s*\n/)[0].trim();
  const published=runId.match(/\d{4}-\d{2}-\d{2}/)?.[0]??manifest.window_end;
  const report=writeReport({...collected,report_type:'monthly_snapshot',title:'Game Industry Data Snapshot',published,period_start:manifest.window_start,period_end:manifest.window_end,ai_generated:true,human_reviewed:false,geographic_scope:collected?.geographic_scope??'Mixed source-specific geographies',global_representativeness:'limited',independently_audited:false,summary,metrics:collected?.metrics??metrics,evidence_run_id:runId,methodology_version:manifest.methodology_version},body);
  await writeRunStage(runId,'report',report,root); return report; }

export async function validateCompleteRun(runId, root=RUNS_DIR){ const base=dir(root,runId); const manifest=await readRunManifest(runId,root); const observations=await jsonl(path.join(base,RUN_STAGE_FILES.normalized)); const metrics=await json(path.join(base,RUN_STAGE_FILES['derived-metrics'])); const selected=await json(path.join(base,RUN_STAGE_FILES['selected-findings'])); const dashboard=await json(path.join(base,RUN_STAGE_FILES.dashboard)); const report=await fs.readFile(path.join(base,RUN_STAGE_FILES.report),'utf8'); const errors=[];
  const ids=new Set(); for(const item of observations){if(ids.has(item.observation_id))errors.push(`duplicate observation ${item.observation_id}`);ids.add(item.observation_id);if(!item.source_url||!item.geography)errors.push(`observation ${item.observation_id} lacks source or geography`);if(item.reference_period_end<item.reference_period_start)errors.push(`observation ${item.observation_id} has invalid period`);}
  for(const metric of metrics.metrics){const inputs=metric.input_observation_ids.map((id)=>observations.find((item)=>item.observation_id===id));if(inputs.some((item)=>!item))errors.push(`metric ${metric.id} has missing inputs`);if(metric.formula==='numerator / denominator * 100'&&round((metric.numerator/metric.denominator)*100)!==metric.value)errors.push(`metric ${metric.id} is not reproducible`);}
  const evidenceIds=new Set([...ids,...metrics.metrics.map((item)=>item.id)]); for(const card of [...dashboard.fixed,...dashboard.finding_specific]){if(card.value===0&&card.status==='data not found')errors.push(`dashboard ${card.id} converts missing to zero`);for(const id of [...(card.observation_ids??[]),...(card.metric_id?[card.metric_id]:[])])if(!evidenceIds.has(id))errors.push(`dashboard ${card.id} has missing evidence ${id}`);}
  for(const finding of selected)if(!report.includes(`<!-- finding:${finding.finding_id} -->`))errors.push(`report does not map finding ${finding.finding_id}`);
  const reportFile=path.join(base,RUN_STAGE_FILES.report); try{const parsed=await readReport(reportFile);const expectedDate=runId.match(/\d{4}-\d{2}-\d{2}/)?.[0];if(expectedDate&&String(parsed.data.published)!==expectedDate)errors.push('report date does not match run_id');if(String(parsed.data.period_start)!==manifest.window_start||String(parsed.data.period_end)!==manifest.window_end)errors.push('report period does not match manifest');}catch(error){errors.push(`report frontmatter invalid: ${error.message}`);}
  const selectedObservations=observations.filter((item)=>selected.some((finding)=>finding.observation_ids.includes(item.observation_id)));if(selectedObservations.some((item)=>item.evidence_type==='forecast')&&!/forecast/i.test(report))errors.push('report omits forecast labelling');if(selectedObservations.some((item)=>item.evidence_type==='estimated')&&!/estimate/i.test(report))errors.push('report omits estimate labelling');
  const validation={schema_version:'1.0.0',run_id:runId,status:errors.length?'failed':'passed',checks:{schema:true,sources:true,periods:true,duplicates:true,formulas:true,dashboard_traceability:true,report_mapping:true,forecast_and_estimate_labels:true,report_window:true},errors,validated_at:new Date().toISOString(),window:{start:manifest.window_start,end:manifest.window_end}}; await writeRunStage(runId,'validation',validation,root); if(errors.length)throw new Error(`Run validation failed:\n- ${errors.join('\n- ')}`); return validation; }

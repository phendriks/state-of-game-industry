import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import { generateMonthlyRun } from './monthly-pipeline.mjs';
import { collectMonthlyEvidence } from './collect-monthly-evidence.mjs';
import { publishRun } from './publish-run.mjs';
import { readReport, reportWindow } from './report-lib.mjs';

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'observatory-monthly-'));
const root = path.join(temporary, 'runs');
const reportsRoot = path.join(temporary, 'reports');
const evidenceRoot = path.join(temporary, 'evidence');
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const calls = [];
const market = { id: 'global_games_revenue', label: 'Global games revenue', value: 213.9, display_value: '$213.9B',
  detail: '2026 forecast', scope: 'Global; 2026', unit: 'billion US dollars', category: 'Market', kind: 'Forecast',
  observed_on: '2026-12-31', period_start: '2026-01-01', period_end: '2026-12-31', published_on: '2026-09-15',
  collected_on: '2026-09-24', source: 'Newzoo', source_url: 'https://newzoo.com/articles/executive-summary-ggmr-2026-free-edition',
  evidence_excerpt: 'Forecast global games revenue is $213.9 billion.' };
const fixture = { data: { geographic_scope: 'Source-specific geographies', global_representativeness: 'limited',
  metrics: [market, { ...market, id: 'global_players', label: 'Global players', value: 3.7, display_value: '3.70B', unit: 'billion players', category: 'Players', evidence_excerpt: 'Forecast global players total 3.70 billion.' }],
  snapshot: { global_games_revenue: 'global_games_revenue', global_players: 'global_players' },
  statistical_observations: [{ id: 'us_game_graduates', label: 'US game-specific awards', display_value: '3,455', detail: 'US awards only',
    source_id: 'us-nces-ipeds', publisher: 'NCES', dataset_name: 'IPEDS completions', source_url: 'https://nces.ed.gov/ipeds/datacenter/data/C2024_A.zip',
    geography: 'United States', reference_period: '2024', observed_on: '2024-12-31', release_date: '2026-01-01', retrieved_at: '2026-09-24',
    revision_status: 'final', measure: 'annual_game_specific_graduates', original_value: 3455, original_unit: 'awards',
    methodology_version: 'talent-v1', precision_class: 'game-specific', coverage_notes: 'Awards are not unique people or verified workers.',
    evidence_excerpt: 'Two game-specific CIP codes report 3,455 awards.' }] } };
const collectFixture = (date, client, _previous, recordCollection) => collectMonthlyEvidence(date, client, fixture, recordCollection);
const fakeClient = { responses: { create: async (request) => {
  const schema = request.text?.format?.name;
  calls.push(schema ?? 'report-copy');
  let payload;
  if (schema === 'monthly_report') {
    payload = { observations: [], statistical_observations: [] };
  } else if (schema === 'candidate_findings') {
    const observations = JSON.parse(request.input.match(/Observations: (\[[\s\S]*?\])\nEvents:/)[1]);
    payload = { candidates: [{ finding_id: 'market-context', finding_type: 'alignment', title: 'Market context',
      statement: 'The market value is a source forecast.', observation_ids: [observations[0].observation_id],
      event_ids: [], metric_ids: [], why_notable: 'Distinguishes the forecast from current activity.' }] };
  } else if (schema === 'challenged_findings') {
    payload = { reviews: [{ finding_id: 'market-context', final_statement: 'The market value remains a forecast.',
      challenges_checked: ['Checked scope, date and forecast status.'], counter_evidence: [],
      status: 'qualified', decision_reason: 'Preserve the source forecast label.' }] };
  } else {
    const findings = JSON.parse(request.input.match(/Findings:(\[[\s\S]*?\])\nObservations:/)[1]);
    return { output_text: `Global market values remain source forecasts. Missing talent flows remain unavailable.\n\n${findings.map((finding) => `<!-- finding:${finding.finding_id} -->\n## ${finding.title}\n\n${finding.final_statement}`).join('\n\n')}` };
  }
  return { output_text: JSON.stringify(payload) };
} } };

try {
  const date = '2026-10-24';
  const runId = `report-${date}-test`;
  await generateMonthlyRun({ reportDate: date, runId, sourceRegistryCommit: 'test' }, { root, client: fakeClient, collect: collectFixture });
  assert.deepEqual(calls, ['monthly_report', 'candidate_findings', 'challenged_findings', 'report-copy']);
  const base = path.join(root, runId);
  const draft = await readReport(path.join(base, 'report.md'));
  assert.equal(draft.data.metrics.find((metric) => metric.id === 'global_games_revenue').value, 213.9);
  assert.equal(draft.data.snapshot.global_players, 'global_players');
  assert.ok(draft.data.talent_pipeline.graduate_supply);
  assert.equal(draft.data.talent_pipeline.workforce_flow?.industry_outflow, undefined);
  assert.equal((await readJson(path.join(base, 'candidate-findings.json'))).length, 1);
  assert.equal((await readJson(path.join(base, 'validation.json'))).status, 'passed');
  await assert.rejects(fs.access(path.join(reportsRoot, `${date}.md`)), { code: 'ENOENT' });
  let builds = 0;
  await publishRun(runId, { root, reportsRoot, evidenceRoot, build: async () => { builds += 1; } });
  assert.equal(builds, 1);
  const archive = path.join(evidenceRoot, `report-${date}`);
  const manifest = await readJson(path.join(archive, 'manifest.json'));
  assert.equal(manifest.status, 'complete');
  assert.ok(Object.values(manifest.stages).every((status) => status === 'written'));
  for (const name of ['source-discovery.json', 'observations.jsonl', 'normalized.jsonl', 'derived-metrics.json',
    'candidate-findings.json', 'validated-findings.json', 'rejected-findings.json', 'selected-findings.json',
    'anomalies.json', 'comparison.json', 'dashboard.json', 'report.md', 'validation.json', 'collected-report.json', 'collection-response.json']) {
    await fs.access(path.join(archive, name));
  }
  assert.equal((await readReport(path.join(reportsRoot, `${date}.md`))).data.evidence_run_id, runId);

  // Optional production rendering check for a newly generated report, beyond the existing report fixtures.
  if (process.argv.includes('--build')) {
    const siteReport = path.resolve('src/data/reports', `pipeline-verification-${process.pid}.md`);
    await fs.writeFile(siteReport, await fs.readFile(path.join(base, 'report.md')), { flag: 'wx' });
    try {
      const rendered = spawnSync(process.execPath, [path.resolve('node_modules/astro/astro.js'), 'build'], { stdio: 'inherit' });
      assert.equal(rendered.status, 0, 'Generated monthly report must pass the production build');
    } finally {
      await fs.rm(siteReport, { force: true });
    }
  }

  // The workflow commits exactly the report and canonical evidence directory, and retains failure artifacts.
  const workflow = YAML.parse(await fs.readFile('.github/workflows/monthly-report.yml', 'utf8'));
  const steps = workflow.jobs.generate.steps;
  assert.equal(steps.find((step) => step.id === 'run').run, 'npm run report:generate');
  assert.ok(steps.some((step) => step.run?.includes('npm run pipeline:publish')));
  assert.ok(steps.some((step) => step.run?.includes('git add --') && step.run.includes('data/evidence/report-')));
  assert.ok(steps.some((step) => step.if === 'always()' && step.with?.path?.includes('data/runs/')));
  assert.equal(workflow.on.workflow_dispatch.inputs.dry_run.default, true);
  assert.equal(workflow.on.schedule[0].cron, '17 6 24 * *');

  // A failed build must restore an existing report and leave no new evidence archive.
  const failureDate = '2026-11-24';
  const failureId = `report-${failureDate}-test`;
  await generateMonthlyRun({ reportDate: failureDate, runId: failureId }, { root, client: fakeClient, collect: collectFixture });
  const priorFile = path.join(reportsRoot, `${failureDate}.md`);
  await fs.writeFile(priorFile, 'previous report bytes');
  await assert.rejects(publishRun(failureId, { root, reportsRoot, evidenceRoot, build: () => { throw new Error('Deliberate build failure'); } }), /Deliberate build failure/);
  assert.equal(await fs.readFile(priorFile, 'utf8'), 'previous report bytes');
  await assert.rejects(fs.access(path.join(evidenceRoot, `report-${failureDate}`)), { code: 'ENOENT' });

  // An entirely empty observation set still produces a validated report and explicit missing dashboard states.
  const emptyDate = '2026-12-24';
  const emptyId = `report-${emptyDate}-test`;
  const emptyData = () => ({ title: 'Empty snapshot', published: emptyDate, period_start: reportWindow(emptyDate).periodStart,
    period_end: reportWindow(emptyDate).periodEnd, metrics: [], snapshot: {}, geographic_scope: 'No verified coverage' });
  const before = calls.length;
  await generateMonthlyRun({ reportDate: emptyDate, runId: emptyId }, { root, client: fakeClient, collect: emptyData });
  assert.deepEqual(calls.slice(before), ['report-copy']);
  const emptyDashboard = await readJson(path.join(root, emptyId, 'dashboard.json'));
  assert.ok(emptyDashboard.fixed.every((card) => card.value === null && card.status === 'data not found'));
  assert.equal((await readJson(path.join(root, emptyId, 'validation.json'))).status, 'passed');

  const badId = 'report-2027-01-24-test';
  await assert.rejects(generateMonthlyRun({ reportDate: '2027-01-24', runId: badId }, {
    root, client: fakeClient, collect: () => { throw new Error('Deliberate collection failure'); }
  }), /Deliberate collection failure/);
  assert.equal((await readJson(path.join(root, badId, 'manifest.json'))).status, 'failed');
  assert.throws(() => reportWindow('2026-13-24'), /invalid month/);
  console.log('Monthly workflow, evidence archival, sparse data and publication recovery tests passed.');
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

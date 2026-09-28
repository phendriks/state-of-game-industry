import fs from 'node:fs/promises';
import path from 'node:path';
import { NEWS_SOURCE_CATEGORIES } from '../src/data/newsSources.ts';
import { STATISTICAL_SOURCES } from '../src/data/statisticalSources.ts';
import { candidateRejectionReasons, EVIDENCE_SCHEMA_VERSION, sourceDiscoverySchemaV1 } from '../src/data/evidence/schema-v1.ts';
import { readRunManifest, RUNS_DIR, RUN_STAGE_FILES, writeRunStage } from './run-workspace.mjs';

const slug = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const subtractDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) - ((days - 1) * 86400000)).toISOString().slice(0, 10);

export function activeRegistrySources() {
  const news = NEWS_SOURCE_CATEGORIES.flatMap((category) => category.sources
    .filter((source) => source.active !== false)
    .map((source) => ({
      source_id: `news-${slug(source.name)}`, name: source.name, publisher: source.publisher ?? source.name,
      canonical_url: source.url, registry: 'news', category: category.id, geography: source.geographic_focus ?? 'Not specified',
      eligible_evidence_classes: ['window', 'context'], quality: {
        primary_secondary: ['First-party / company','Government / regulator','Financial filing','Platform data'].includes(source.type) ? 'primary' : source.type === 'Games media' ? 'secondary' : 'mixed',
        official: source.type ? ['First-party / company','Government / regulator','Financial filing','Trade body'].includes(source.type) : null,
        independent: source.type ? !['First-party / company','Trade body'].includes(source.type) : null, methodology_published: null,
        reference_period_clear: null, geography_clear: Boolean(source.geographic_focus), reproducible_query: false,
        measurement_kind: source.type === 'Market estimate' ? 'estimate' : source.type === 'Research / survey' ? 'survey' : 'unknown'
      }, active: true
    })));
  const statistical = STATISTICAL_SOURCES.filter((source) => source.active).map((source) => ({
    source_id: `stat-${source.id}`, name: source.name, publisher: source.publisher, canonical_url: source.url,
    registry: 'statistical', category: source.category, geography: source.geography,
    eligible_evidence_classes: ['context', 'historical_baseline'], active: true
    ,quality: { primary_secondary: 'primary', official: true, independent: true, methodology_published: true, reference_period_clear: true, geography_clear: true, reproducible_query: Boolean(source.classificationSystem), measurement_kind: source.sourceType.includes('survey') ? 'survey' : 'reported' }
  }));
  return [...news, ...statistical];
}

export async function createAcquisitionPlan(runId, evidenceDays = 75, root = RUNS_DIR) {
  if (!Number.isInteger(evidenceDays) || evidenceDays < 60 || evidenceDays > 90) throw new Error('Evidence window must be an integer between 60 and 90 days.');
  const manifest = await readRunManifest(runId, root);
  const plan = sourceDiscoverySchemaV1.parse({
    schema_version: EVIDENCE_SCHEMA_VERSION,
    run_id: runId,
    publication_window: { start: manifest.window_start, end: manifest.window_end },
    acquisition_window: { start: subtractDays(manifest.window_end, evidenceDays), end: manifest.window_end, days: evidenceDays },
    evidence_classes: {
      window: 'Evidence published or directly observed inside the rolling acquisition window.',
      context: 'Slower-moving annual, quarterly or official evidence still applicable to the report.',
      historical_baseline: 'Previously stored evidence used only for longitudinal comparison.'
    },
    registry_sources: activeRegistrySources(), candidates: [], accepted_candidate_ids: [], rejected_candidates: []
  });
  await writeRunStage(runId, 'source-discovery', plan, root);
  return plan;
}

export async function readSourceDiscovery(runId, root = RUNS_DIR) {
  const file = path.join(path.resolve(root), runId, RUN_STAGE_FILES['source-discovery']);
  return sourceDiscoverySchemaV1.parse(JSON.parse(await fs.readFile(file, 'utf8')));
}

export async function addCandidateSource(runId, candidate, root = RUNS_DIR) {
  const discovery = await readSourceDiscovery(runId, root);
  if (discovery.candidates.some((item) => item.candidate_id === candidate.candidateId)) throw new Error(`Candidate already exists: ${candidate.candidateId}`);
  const updated = sourceDiscoverySchemaV1.parse({ ...discovery, candidates: [...discovery.candidates, {
    candidate_id: candidate.candidateId, name: candidate.name, publisher: candidate.publisher, canonical_url: candidate.canonicalUrl,
    geography: candidate.geography, needed_for: candidate.neededFor, discovered_at: candidate.discoveredAt ?? new Date().toISOString(),
    evidence_class: candidate.evidenceClass ?? 'window', decision: 'pending', rejection_reason: null, evaluation_note: null, registry_update: 'none'
  }] });
  await writeRunStage(runId, 'source-discovery', updated, root);
  return updated;
}

export async function evaluateCandidateSource(runId, candidateId, { decision, reason = null, note, proposeRegistryUpdate = false }, root = RUNS_DIR) {
  if (!['accepted', 'rejected'].includes(decision)) throw new Error('Candidate decision must be accepted or rejected.');
  if (decision === 'rejected' && !candidateRejectionReasons.includes(reason)) throw new Error(`Rejected candidates require one of: ${candidateRejectionReasons.join(', ')}`);
  const discovery = await readSourceDiscovery(runId, root);
  if (!discovery.candidates.some((candidate) => candidate.candidate_id === candidateId)) throw new Error(`Unknown candidate: ${candidateId}`);
  const candidates = discovery.candidates.map((candidate) => candidate.candidate_id === candidateId ? {
    ...candidate, decision, rejection_reason: decision === 'rejected' ? reason : null, evaluation_note: note,
    registry_update: decision === 'accepted' && proposeRegistryUpdate ? 'proposed' : 'none'
  } : candidate);
  const accepted_candidate_ids = candidates.filter((candidate) => candidate.decision === 'accepted').map((candidate) => candidate.candidate_id);
  const rejected_candidates = candidates.filter((candidate) => candidate.decision === 'rejected').map((candidate) => ({ candidate_id: candidate.candidate_id, reason: candidate.rejection_reason }));
  const updated = sourceDiscoverySchemaV1.parse({ ...discovery, candidates, accepted_candidate_ids, rejected_candidates });
  await writeRunStage(runId, 'source-discovery', updated, root);
  return updated;
}

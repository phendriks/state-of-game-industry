import { z } from 'zod';

export const EVIDENCE_SCHEMA_VERSION = '1.0.0' as const;

const id = z.string().trim().regex(/^[a-z0-9][a-z0-9._:-]*$/, 'Use a stable lowercase identifier.');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Invalid date.');
const instant = z.string().datetime({ offset: true });
const schemaVersion = z.literal(EVIDENCE_SCHEMA_VERSION);
const methodologyVersion = z.string().trim().min(1);

export const evidenceTypes = ['reported', 'observed', 'estimated', 'forecast', 'derived', 'survey', 'proxy'] as const;
export const entityTypes = ['company', 'parent_company', 'publisher', 'developer', 'studio', 'game', 'franchise', 'market', 'workforce', 'education', 'other'] as const;
export const runStageNames = ['source-discovery', 'observations', 'events', 'normalized', 'derived-metrics', 'candidate-findings', 'validated-findings', 'rejected-findings', 'selected-findings', 'anomalies', 'comparison', 'dashboard', 'report', 'validation'] as const;
export const evidenceClasses = ['window', 'context', 'historical_baseline'] as const;
export const candidateRejectionReasons = ['duplicate', 'low_provenance', 'seo_aggregation', 'no_original_methodology', 'stale', 'inaccessible', 'unverifiable'] as const;

const runStages = z.object(Object.fromEntries(runStageNames.map((name) => [name, z.enum(['pending', 'written'])])) as Record<(typeof runStageNames)[number], z.ZodTypeAny>).strict();

export const runManifestSchemaV1 = z.object({
  run_id: id,
  window_start: date,
  window_end: date,
  schema_version: schemaVersion,
  methodology_version: methodologyVersion,
  model: z.string().trim().min(1),
  reasoning_effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']),
  source_registry_commit: z.string().trim().min(1),
  started_at: instant,
  completed_at: instant.nullable(),
  status: z.enum(['initialized', 'running', 'failed', 'complete']),
  stages: runStages,
  failure: z.string().trim().min(1).nullable()
}).strict().refine((manifest) => manifest.window_end >= manifest.window_start, {
  path: ['window_end'], message: 'Run window cannot end before it starts.'
}).superRefine((manifest, context) => {
  if (['failed', 'complete'].includes(manifest.status) !== Boolean(manifest.completed_at)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['completed_at'], message: 'Terminal runs require completed_at; non-terminal runs must leave it null.' });
  }
  if ((manifest.status === 'failed') !== Boolean(manifest.failure)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['failure'], message: 'Only failed runs require a failure message.' });
  }
});

const acquisitionSourceSchema = z.object({
  source_id: id,
  name: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  canonical_url: z.string().url(),
  registry: z.enum(['news', 'statistical']),
  category: z.string().trim().min(1),
  geography: z.string().trim().min(1),
  eligible_evidence_classes: z.array(z.enum(evidenceClasses)).min(1),
  quality: z.object({ primary_secondary: z.enum(['primary','secondary','mixed','unknown']), official: z.boolean().nullable(), independent: z.boolean().nullable(), methodology_published: z.boolean().nullable(), reference_period_clear: z.boolean().nullable(), geography_clear: z.boolean().nullable(), reproducible_query: z.boolean().nullable(), measurement_kind: z.enum(['reported','estimate','forecast','survey','mixed','unknown']) }).strict(),
  active: z.literal(true)
}).strict();

const candidateSourceSchema = z.object({
  candidate_id: id,
  name: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  canonical_url: z.string().url(),
  geography: z.string().trim().min(1),
  needed_for: z.string().trim().min(1),
  discovered_at: instant,
  evidence_class: z.enum(evidenceClasses),
  decision: z.enum(['pending', 'accepted', 'rejected']),
  rejection_reason: z.enum(candidateRejectionReasons).nullable(),
  evaluation_note: z.string().trim().min(1).nullable(),
  registry_update: z.enum(['none', 'proposed'])
}).strict().superRefine((candidate, context) => {
  if (candidate.decision === 'rejected' && !candidate.rejection_reason) context.addIssue({ code: z.ZodIssueCode.custom, path: ['rejection_reason'], message: 'Rejected candidates require a reason.' });
  if (candidate.decision !== 'rejected' && candidate.rejection_reason) context.addIssue({ code: z.ZodIssueCode.custom, path: ['rejection_reason'], message: 'Only rejected candidates may have a rejection reason.' });
  if (candidate.decision !== 'pending' && !candidate.evaluation_note) context.addIssue({ code: z.ZodIssueCode.custom, path: ['evaluation_note'], message: 'Evaluated candidates require a note.' });
  if (candidate.registry_update === 'proposed' && candidate.decision !== 'accepted') context.addIssue({ code: z.ZodIssueCode.custom, path: ['registry_update'], message: 'Only accepted candidates may propose a registry update.' });
});

export const sourceDiscoverySchemaV1 = z.object({
  schema_version: schemaVersion,
  run_id: id,
  publication_window: z.object({ start: date, end: date }).strict(),
  acquisition_window: z.object({ start: date, end: date, days: z.number().int().min(60).max(90) }).strict(),
  evidence_classes: z.object({
    window: z.string().trim().min(1),
    context: z.string().trim().min(1),
    historical_baseline: z.string().trim().min(1)
  }).strict(),
  registry_sources: z.array(acquisitionSourceSchema),
  candidates: z.array(candidateSourceSchema),
  accepted_candidate_ids: z.array(id),
  rejected_candidates: z.array(z.object({ candidate_id: id, reason: z.enum(candidateRejectionReasons) }).strict())
}).strict().superRefine((discovery, context) => {
  if (discovery.publication_window.end < discovery.publication_window.start) context.addIssue({ code: z.ZodIssueCode.custom, path: ['publication_window', 'end'], message: 'Publication window cannot end before it starts.' });
  if (discovery.acquisition_window.end < discovery.acquisition_window.start) context.addIssue({ code: z.ZodIssueCode.custom, path: ['acquisition_window', 'end'], message: 'Acquisition window cannot end before it starts.' });
  const acquisitionDays = Math.floor((Date.parse(`${discovery.acquisition_window.end}T00:00:00Z`) - Date.parse(`${discovery.acquisition_window.start}T00:00:00Z`)) / 86400000) + 1;
  if (acquisitionDays !== discovery.acquisition_window.days) context.addIssue({ code: z.ZodIssueCode.custom, path: ['acquisition_window', 'days'], message: 'Acquisition-window day count does not match its dates.' });
  if (discovery.acquisition_window.end !== discovery.publication_window.end) context.addIssue({ code: z.ZodIssueCode.custom, path: ['acquisition_window', 'end'], message: 'Acquisition and publication windows must share the same cutoff date.' });
  const sourceIds = discovery.registry_sources.map((source) => source.source_id);
  if (new Set(sourceIds).size !== sourceIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['registry_sources'], message: 'Registry source IDs must be unique.' });
  const candidateIds = discovery.candidates.map((candidate) => candidate.candidate_id);
  if (new Set(candidateIds).size !== candidateIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['candidates'], message: 'Candidate source IDs must be unique.' });
  const candidates = new Map(discovery.candidates.map((candidate) => [candidate.candidate_id, candidate]));
  for (const candidateId of discovery.accepted_candidate_ids) if (candidates.get(candidateId)?.decision !== 'accepted') context.addIssue({ code: z.ZodIssueCode.custom, path: ['accepted_candidate_ids'], message: `${candidateId} is not an accepted candidate.` });
  for (const rejected of discovery.rejected_candidates) if (candidates.get(rejected.candidate_id)?.decision !== 'rejected' || candidates.get(rejected.candidate_id)?.rejection_reason !== rejected.reason) context.addIssue({ code: z.ZodIssueCode.custom, path: ['rejected_candidates'], message: `${rejected.candidate_id} does not match its rejected candidate record.` });
  const acceptedIds = discovery.candidates.filter((candidate) => candidate.decision === 'accepted').map((candidate) => candidate.candidate_id).sort();
  if (JSON.stringify([...discovery.accepted_candidate_ids].sort()) !== JSON.stringify(acceptedIds)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['accepted_candidate_ids'], message: 'Accepted-candidate index must exactly match evaluated candidates.' });
  const rejectedIds = discovery.candidates.filter((candidate) => candidate.decision === 'rejected').map((candidate) => candidate.candidate_id).sort();
  if (JSON.stringify(discovery.rejected_candidates.map((candidate) => candidate.candidate_id).sort()) !== JSON.stringify(rejectedIds)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['rejected_candidates'], message: 'Rejected-candidate index must exactly match evaluated candidates.' });
});

export const observationSchemaV1 = z.object({
  schema_version: schemaVersion,
  methodology_version: methodologyVersion,
  observation_id: id,
  run_id: id,
  entity: z.string().trim().min(1),
  entity_type: z.enum(entityTypes),
  metric: id,
  value: z.union([z.number().finite(), z.string().trim().min(1), z.boolean()]),
  original_value: z.union([z.number().finite(), z.string().trim().min(1), z.boolean()]),
  unit: z.string().trim().min(1),
  reference_period_start: date,
  reference_period_end: date,
  observed_at: instant,
  retrieved_at: instant,
  source_id: id,
  source_url: z.string().url(),
  underlying_source_id: id.nullable(),
  geography: z.string().trim().min(1),
  evidence_type: z.enum(evidenceTypes),
  evidence_class: z.enum(evidenceClasses),
  confidence: z.enum(['high', 'medium', 'low']),
  raw_claim: z.string().trim().min(1),
  normalized_claim: z.string().trim().min(1),
  dataset_id: z.string().trim().min(1).optional(),
  table_id: z.string().trim().min(1).optional(),
  document_page: z.string().trim().min(1).optional(),
  query_or_filter: z.string().trim().min(1).optional(),
  source_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional()
}).strict().superRefine((observation, context) => {
  if (observation.reference_period_end < observation.reference_period_start) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reference_period_end'], message: 'Reference period cannot end before it starts.' });
  }
  if (observation.underlying_source_id === observation.source_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['underlying_source_id'], message: 'Omit the underlying source or identify a different originating source.' });
  }
  if (observation.raw_claim.split(/\s+/).length > 25) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['raw_claim'], message: 'Raw claim must not exceed 25 words.' });
  }
});

export const canonicalEntitySchemaV1 = z.object({
  schema_version: schemaVersion,
  entity_id: id,
  canonical_name: z.string().trim().min(1),
  entity_type: z.enum(['parent_company', 'publisher', 'developer', 'studio', 'game', 'franchise']),
  aliases: z.array(z.string().trim().min(1)),
  parent_entity_id: id.nullable(),
  active: z.boolean()
}).strict().refine((entity) => entity.parent_entity_id !== entity.entity_id, {
  path: ['parent_entity_id'], message: 'An entity cannot be its own parent.'
});

export const entityRegistrySchemaV1 = z.object({
  schema_version: schemaVersion,
  entities: z.array(canonicalEntitySchemaV1)
}).strict().superRefine((registry, context) => {
  const ids = registry.entities.map((entity) => entity.entity_id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['entities'], message: 'Entity IDs must be unique.' });
  const known = new Set(ids);
  for (const entity of registry.entities) if (entity.parent_entity_id && !known.has(entity.parent_entity_id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['entities'], message: `${entity.entity_id} references unknown parent ${entity.parent_entity_id}.` });
});

export const eventCandidateSchemaV1 = z.object({
  candidate_event_id: id,
  event_type: id,
  entity_mentions: z.array(z.string().trim().min(1)).min(1),
  event_start: date,
  event_end: date.optional(),
  geography: z.string().trim().min(1),
  observation_ids: z.array(id).min(1),
  factual_summary: z.string().trim().min(1)
}).strict();

export const jobPostingSchemaV1 = z.object({
  company_entity_id: id,
  title: z.string().trim().min(1),
  location: z.string().trim().min(1),
  ats_id: z.string().trim().min(1).nullable(),
  posting_url: z.string().url(),
  observed_at: instant
}).strict();

export const reconciledJobSchemaV1 = jobPostingSchemaV1.omit({ observed_at: true }).extend({
  job_fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  normalized_title: z.string().trim().min(1),
  normalized_location: z.string().trim().min(1),
  first_seen: instant,
  last_seen: instant,
  closed_at: instant.nullable(),
  reopened_at: instant.nullable()
}).strict();

export const sourceSchemaV1 = z.object({
  schema_version: schemaVersion,
  source_id: id,
  name: z.string().trim().min(1),
  publisher: z.string().trim().min(1),
  canonical_url: z.string().url(),
  source_type: z.enum(['first_party', 'official_statistics', 'regulator', 'trade_body', 'research', 'financial_filing', 'platform_data', 'tracker', 'news', 'other']),
  geography: z.string().trim().min(1),
  language: z.string().trim().min(1),
  frequency: z.string().trim().min(1),
  role: z.string().trim().min(1),
  limitations: z.string().trim().min(1),
  active: z.boolean()
}).strict();

export const eventSchemaV1 = z.object({
  schema_version: schemaVersion,
  methodology_version: methodologyVersion,
  event_id: id,
  run_id: id,
  event_type: id,
  entity_ids: z.array(id).min(1),
  event_start: date,
  event_end: date.optional(),
  geography: z.string().trim().min(1),
  observation_ids: z.array(id).min(1),
  factual_summary: z.string().trim().min(1)
}).strict().refine((event) => !event.event_end || event.event_end >= event.event_start, {
  path: ['event_end'], message: 'Event end cannot be before event start.'
});

export const findingSchemaV1 = z.object({
  schema_version: schemaVersion,
  methodology_version: methodologyVersion,
  finding_id: id,
  run_id: id,
  title: z.string().trim().min(1),
  statement: z.string().trim().min(1),
  observation_ids: z.array(id).min(1),
  event_ids: z.array(id).default([]),
  status: z.enum(['draft', 'validated', 'rejected']),
  limitations: z.array(z.string().trim().min(1)).min(1)
}).strict();

export const findingTypes = ['conflict', 'confusion', 'alignment', 'correction'] as const;
export const challengeStatuses = ['confirmed', 'qualified', 'resolved', 'rejected', 'insufficient_evidence'] as const;

export const candidateFindingSchemaV1 = z.object({
  schema_version: schemaVersion,
  methodology_version: methodologyVersion,
  finding_id: id,
  run_id: id,
  finding_type: z.enum(findingTypes),
  title: z.string().trim().min(1),
  statement: z.string().trim().min(1),
  observation_ids: z.array(id).min(1),
  event_ids: z.array(id),
  metric_ids: z.array(id),
  why_notable: z.string().trim().min(1),
  status: z.literal('candidate')
}).strict();

const counterEvidenceSchema = z.object({
  claim: z.string().trim().min(1),
  source_id: id,
  source_url: z.string().url(),
  underlying_source_id: id.nullable(),
  evidence_type: z.enum(evidenceTypes),
  geography: z.string().trim().min(1),
  reference_period_start: date,
  reference_period_end: date
}).strict().superRefine((evidence, context) => {
  if (evidence.reference_period_end < evidence.reference_period_start) context.addIssue({ code: z.ZodIssueCode.custom, path: ['reference_period_end'], message: 'Counter-evidence period cannot end before it starts.' });
  if (evidence.underlying_source_id === evidence.source_id) context.addIssue({ code: z.ZodIssueCode.custom, path: ['underlying_source_id'], message: 'Underlying source must differ from the consulted source.' });
  if (evidence.claim.split(/\s+/).length > 25) context.addIssue({ code: z.ZodIssueCode.custom, path: ['claim'], message: 'Counter-evidence claim must not exceed 25 words.' });
});

export const challengedFindingSchemaV1 = z.object({
  schema_version: schemaVersion,
  methodology_version: methodologyVersion,
  finding_id: id,
  run_id: id,
  finding_type: z.enum(findingTypes),
  title: z.string().trim().min(1),
  original_statement: z.string().trim().min(1),
  final_statement: z.string().trim().min(1),
  observation_ids: z.array(id).min(1),
  event_ids: z.array(id),
  metric_ids: z.array(id),
  challenges_checked: z.array(z.string().trim().min(1)).min(1),
  counter_evidence: z.array(counterEvidenceSchema),
  status: z.enum(challengeStatuses),
  decision_reason: z.string().trim().min(1)
}).strict();

export const candidateFindingCollectionSchemaV1 = z.array(candidateFindingSchemaV1).max(20).superRefine((findings, context) => {
  const ids = findings.map((finding) => finding.finding_id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Candidate finding IDs must be unique.' });
});

export const challengedFindingCollectionSchemaV1 = z.array(challengedFindingSchemaV1).superRefine((findings, context) => {
  const ids = findings.map((finding) => finding.finding_id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Challenged finding IDs must be unique.' });
});

export const evidenceReportSchemaV1 = z.object({
  schema_version: schemaVersion,
  methodology_version: methodologyVersion,
  report_id: id,
  run_id: id,
  title: z.string().trim().min(1),
  window_start: date,
  window_end: date,
  published_at: instant,
  finding_ids: z.array(id),
  observation_ids: z.array(id).min(1)
}).strict().refine((report) => report.window_end >= report.window_start, {
  path: ['window_end'], message: 'Report window cannot end before it starts.'
});

export const evidenceSchemasV1 = {
  observations: observationSchemaV1,
  sources: sourceSchemaV1,
  events: eventSchemaV1,
  findings: findingSchemaV1,
  reports: evidenceReportSchemaV1
} as const;

export type ObservationV1 = z.infer<typeof observationSchemaV1>;
export type SourceV1 = z.infer<typeof sourceSchemaV1>;
export type EventV1 = z.infer<typeof eventSchemaV1>;
export type FindingV1 = z.infer<typeof findingSchemaV1>;
export type EvidenceReportV1 = z.infer<typeof evidenceReportSchemaV1>;
export type RunManifestV1 = z.infer<typeof runManifestSchemaV1>;
export type SourceDiscoveryV1 = z.infer<typeof sourceDiscoverySchemaV1>;
export type CanonicalEntityV1 = z.infer<typeof canonicalEntitySchemaV1>;
export type ReconciledJobV1 = z.infer<typeof reconciledJobSchemaV1>;
export type CandidateFindingV1 = z.infer<typeof candidateFindingSchemaV1>;
export type ChallengedFindingV1 = z.infer<typeof challengedFindingSchemaV1>;

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { entityRegistrySchemaV1, eventCandidateSchemaV1, eventSchemaV1, jobPostingSchemaV1, reconciledJobSchemaV1 } from '../src/data/evidence/schema-v1.ts';
import { RUNS_DIR, writeRunStage } from './run-workspace.mjs';

export const ENTITY_REGISTRY_FILE = path.resolve('data/entities/entities.v1.json');
const normalize = (value) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const fingerprint = (parts) => `sha256:${crypto.createHash('sha256').update(parts.join('|')).digest('hex')}`;

export async function loadEntityRegistry(file = ENTITY_REGISTRY_FILE) {
  return entityRegistrySchemaV1.parse(JSON.parse(await fs.readFile(file, 'utf8')));
}

export function entityResolver(registry) {
  const aliases = new Map();
  for (const entity of registry.entities) {
    for (const value of [entity.entity_id, entity.canonical_name, ...entity.aliases]) {
      const key = normalize(value);
      if (aliases.has(key) && aliases.get(key) !== entity.entity_id) throw new Error(`Ambiguous entity alias: ${value}`);
      aliases.set(key, entity.entity_id);
    }
  }
  return (mention) => aliases.get(normalize(mention));
}

export async function reconcileEventCandidates(runId, candidates, observationIds, root = RUNS_DIR, registryFile = ENTITY_REGISTRY_FILE) {
  const registry = await loadEntityRegistry(registryFile);
  const resolve = entityResolver(registry);
  const groups = new Map();
  for (const raw of [...candidates].sort((a, b) => a.candidate_event_id.localeCompare(b.candidate_event_id))) {
    const candidate = eventCandidateSchemaV1.parse(raw);
    for (const observationId of candidate.observation_ids) if (!observationIds.has(observationId)) throw new Error(`Event candidate ${candidate.candidate_event_id} references unknown observation ${observationId}.`);
    const entityIds = [...new Set(candidate.entity_mentions.map((mention) => {
      const entityId = resolve(mention);
      if (!entityId) throw new Error(`Unknown entity mention: ${mention}`);
      return entityId;
    }))].sort();
    const key = fingerprint([candidate.event_type, entityIds.join(','), candidate.event_start, normalize(candidate.geography)]);
    const existing = groups.get(key);
    if (existing) {
      existing.observation_ids = [...new Set([...existing.observation_ids, ...candidate.observation_ids])].sort();
      existing.event_end = [existing.event_end, candidate.event_end].filter(Boolean).sort().at(-1);
    } else {
      groups.set(key, { schema_version: '1.0.0', methodology_version: 'reconciliation-v1', event_id: `event-${key.slice(7, 23)}`, run_id: runId,
        event_type: candidate.event_type, entity_ids: entityIds, event_start: candidate.event_start, ...(candidate.event_end ? { event_end: candidate.event_end } : {}),
        geography: candidate.geography, observation_ids: [...new Set(candidate.observation_ids)].sort(), factual_summary: candidate.factual_summary });
    }
  }
  const events = [...groups.values()].map((event) => eventSchemaV1.parse(event));
  await writeRunStage(runId, 'events', events, root);
  return events;
}

export function reconcileJobs(previousRecords, currentPostings, observedAt) {
  const previous = new Map(previousRecords.map((record) => {
    const job = reconciledJobSchemaV1.parse(record);
    return [job.job_fingerprint, job];
  }));
  const current = new Map();
  for (const raw of currentPostings) {
    const posting = jobPostingSchemaV1.parse(raw);
    const normalizedTitle = normalize(posting.title);
    const normalizedLocation = normalize(posting.location);
    const identity = posting.ats_id ? `ats:${normalize(posting.ats_id)}` : `url:${new URL(posting.posting_url).origin}${new URL(posting.posting_url).pathname.replace(/\/$/, '')}`;
    const jobFingerprint = fingerprint([posting.company_entity_id, normalizedTitle, normalizedLocation, identity]);
    const earlier = previous.get(jobFingerprint);
    current.set(jobFingerprint, reconciledJobSchemaV1.parse({
      company_entity_id: posting.company_entity_id, title: posting.title, location: posting.location, ats_id: posting.ats_id, posting_url: posting.posting_url,
      job_fingerprint: jobFingerprint, normalized_title: normalizedTitle, normalized_location: normalizedLocation,
      first_seen: earlier?.first_seen ?? observedAt, last_seen: observedAt, closed_at: null,
      reopened_at: earlier?.closed_at ? observedAt : (earlier?.reopened_at ?? null)
    }));
  }
  for (const [jobFingerprint, earlier] of previous) if (!current.has(jobFingerprint)) current.set(jobFingerprint, reconciledJobSchemaV1.parse({ ...earlier, closed_at: earlier.closed_at ?? observedAt }));
  return [...current.values()].sort((a, b) => a.job_fingerprint.localeCompare(b.job_fingerprint));
}

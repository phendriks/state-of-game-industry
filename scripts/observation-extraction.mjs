import { observationSchemaV1 } from '../src/data/evidence/schema-v1.ts';
import { hostnameMatches } from './report-lib.mjs';
import { readRunManifest, RUNS_DIR, writeRunStage } from './run-workspace.mjs';
import { readSourceDiscovery } from './source-acquisition.mjs';

export async function validateAndStoreAtomicObservations(runId, records, root = RUNS_DIR) {
  if (!Array.isArray(records)) throw new Error('Extracted observations must be an array.');
  const manifest = await readRunManifest(runId, root);
  const discovery = await readSourceDiscovery(runId, root);
  const allowedSources = new Map(discovery.registry_sources.map((source) => [source.source_id, source]));
  for (const candidate of discovery.candidates.filter((source) => source.decision === 'accepted')) {
    allowedSources.set(candidate.candidate_id, { canonical_url: candidate.canonical_url });
  }
  const seen = new Set();
  const observations = records.map((record, index) => {
    const observation = observationSchemaV1.parse({ ...record, schema_version: manifest.schema_version, methodology_version: manifest.methodology_version, run_id: runId });
    if (seen.has(observation.observation_id)) throw new Error(`Duplicate observation_id at record ${index + 1}: ${observation.observation_id}`);
    seen.add(observation.observation_id);
    const source = allowedSources.get(observation.source_id);
    if (!source) throw new Error(`Observation ${observation.observation_id} uses an unaccepted source: ${observation.source_id}`);
    if (observation.underlying_source_id && !allowedSources.has(observation.underlying_source_id)) throw new Error(`Observation ${observation.observation_id} names an unknown underlying source: ${observation.underlying_source_id}`);
    if (!hostnameMatches(observation.source_url, source.canonical_url)) throw new Error(`Observation ${observation.observation_id} URL does not match its registered or accepted source.`);
    if (observation.evidence_class === 'window' && (observation.observed_at.slice(0, 10) < discovery.acquisition_window.start || observation.observed_at.slice(0, 10) > discovery.acquisition_window.end)) {
      throw new Error(`Observation ${observation.observation_id} is outside the acquisition window but labelled window evidence.`);
    }
    return observation;
  });
  await writeRunStage(runId, 'observations', observations, root);
  return observations;
}

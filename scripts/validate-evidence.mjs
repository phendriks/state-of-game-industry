import fs from 'node:fs/promises';
import path from 'node:path';
import { evidenceSchemasV1 } from '../src/data/evidence/schema-v1.ts';

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const type = argument('type');
const file = argument('file');

if (!type || !(type in evidenceSchemasV1) || !file) {
  throw new Error('Usage: npm run evidence:validate -- --type=observations|sources|events|findings|reports --file=<json-or-jsonl>');
}

const raw = await fs.readFile(path.resolve(file), 'utf8');
const records = file.endsWith('.jsonl')
  ? raw.split(/\r?\n/).map((line, index) => ({ line: index + 1, text: line })).filter(({ text }) => text.trim()).map(({ line, text }) => {
      try { return { label: `line ${line}`, value: JSON.parse(text) }; }
      catch (error) { throw new Error(`${file}: line ${line}: invalid JSON: ${error.message}`); }
    })
  : (() => {
      const value = JSON.parse(raw);
      return (Array.isArray(value) ? value : [value]).map((record, index) => ({ label: `record ${index + 1}`, value: record }));
    })();

const schema = evidenceSchemasV1[type];
const idField = { observations: 'observation_id', sources: 'source_id', events: 'event_id', findings: 'finding_id', reports: 'report_id' }[type];
const ids = new Set();

for (const record of records) {
  const result = schema.safeParse(record.value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ');
    throw new Error(`${file}: ${record.label}: ${details}`);
  }
  const recordId = result.data[idField];
  if (ids.has(recordId)) throw new Error(`${file}: ${record.label}: duplicate ${idField} ${recordId}`);
  ids.add(recordId);
}

console.log(`Validated ${records.length} ${type} record(s) against evidence schema 1.0.0.`);

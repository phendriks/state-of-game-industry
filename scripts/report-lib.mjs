import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

export const REPORTS_DIR = path.resolve('src/data/reports');
export const CATEGORY_LIMITS = {
  Market: 10,
  Players: 8,
  Employment: 12,
  Business: 10,
  Corporate: 12,
  Products: 6
};
export const RETENTION_DAYS = {
  Market: 400,
  Players: 400,
  Employment: 120,
  Business: 400,
  Corporate: 180,
  Products: 31
};

export function reportWindow(published) {
  const match = /^(\d{4})-(\d{2})-24$/.exec(published);
  if (!match) throw new Error('Report date must be the 24th in YYYY-MM-24 format.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const previous = new Date(Date.UTC(year, month - 2, 24));
  return {
    published,
    periodStart: previous.toISOString().slice(0, 10),
    periodEnd: `${match[1]}-${match[2]}-23`
  };
}

export function amsterdamDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export async function readReport(file) {
  const raw = await fs.readFile(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`Invalid report frontmatter: ${file}`);
  return { data: YAML.parse(match[1]), body: match[2].trim() };
}

export async function latestReport(preferredName) {
  const names = (await fs.readdir(REPORTS_DIR))
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
    .sort().reverse();
  if (names.includes(preferredName)) return readReport(path.join(REPORTS_DIR, preferredName));
  if (!names.length) throw new Error('No earlier report is available as a safe baseline.');
  return readReport(path.join(REPORTS_DIR, names[0]));
}

export function writeReport(data, body) {
  return `---\n${YAML.stringify(data, { lineWidth: 0 })}---\n\n# Game Industry Data Snapshot\n\n## Industry summary\n\n${body.trim()}\n`;
}

export function dayDifference(later, earlier) {
  return Math.floor((Date.parse(later) - Date.parse(earlier)) / 86400000);
}

export function hostnameMatches(candidate, registered) {
  const normalize = (value) => new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  const candidateHost = normalize(candidate);
  const registeredHost = normalize(registered);
  return candidateHost === registeredHost
    || candidateHost.endsWith(`.${registeredHost}`)
    || registeredHost.endsWith(`.${candidateHost}`);
}

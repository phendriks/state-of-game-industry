import { initializeRunWorkspace } from './run-workspace.mjs';

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const runId = argument('run-id');
const windowStart = argument('window-start');
const windowEnd = argument('window-end');
const sourceRegistryCommit = argument('source-registry-commit') ?? process.env.GITHUB_SHA ?? 'local-uncommitted';

if (!runId || !windowStart || !windowEnd) {
  throw new Error('Usage: npm run report:run:init -- --run-id=<id> --window-start=YYYY-MM-DD --window-end=YYYY-MM-DD [--source-registry-commit=<sha>]');
}

const { directory } = await initializeRunWorkspace({ runId, windowStart, windowEnd, sourceRegistryCommit });
console.log(`Initialized durable run workspace: ${directory}`);

import { initializeRunWorkspace } from './run-workspace.mjs';
import { readArgument } from './script-input.mjs';

const runId = readArgument('run-id');
const windowStart = readArgument('window-start');
const windowEnd = readArgument('window-end');
const sourceRegistryCommit = readArgument('source-registry-commit') ?? process.env.GITHUB_SHA ?? 'local-uncommitted';

if (!runId || !windowStart || !windowEnd) {
  throw new Error('Usage: npm run report:run:init -- --run-id=<id> --window-start=YYYY-MM-DD --window-end=YYYY-MM-DD [--source-registry-commit=<sha>]');
}

const { directory } = await initializeRunWorkspace({ runId, windowStart, windowEnd, sourceRegistryCommit });
console.log(`Initialized durable run workspace: ${directory}`);

import { createAcquisitionPlan } from './source-acquisition.mjs';
import { readArgument } from './script-input.mjs';

const runId = readArgument('run-id');
const evidenceDays = Number(readArgument('evidence-days') ?? 75);
if (!runId) throw new Error('Usage: npm run acquisition:plan -- --run-id=<id> [--evidence-days=60..90]');
const plan = await createAcquisitionPlan(runId, evidenceDays);
console.log(`Wrote acquisition plan with ${plan.registry_sources.length} active registry sources and a ${plan.acquisition_window.days}-day evidence window.`);

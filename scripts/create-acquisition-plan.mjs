import { createAcquisitionPlan } from './source-acquisition.mjs';

const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const runId = argument('run-id');
const evidenceDays = Number(argument('evidence-days') ?? 75);
if (!runId) throw new Error('Usage: npm run acquisition:plan -- --run-id=<id> [--evidence-days=60..90]');
const plan = await createAcquisitionPlan(runId, evidenceDays);
console.log(`Wrote acquisition plan with ${plan.registry_sources.length} active registry sources and a ${plan.acquisition_window.days}-day evidence window.`);

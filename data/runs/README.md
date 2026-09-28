# Local run workspaces

Each evidence run receives one durable directory named by `run_id`. Stage files are created before collection begins and updated atomically. The manifest records which stages have been written and whether the run is initialized, running, failed or complete.

Initialize a local run with:

```sh
npm run report:run:init -- --run-id=run-2026-12-17 --window-start=2026-09-18 --window-end=2026-12-16 --source-registry-commit=<commit>
```

Run contents are ignored by Git so incomplete research cannot be included in a normal commit. Failed workspaces remain on disk for inspection, and the monthly workflow uploads available run files as Actions artifacts even after failure. Passed runs are archived under `data/evidence/` together with their published report.

Prepare the active-registry acquisition plan separately from publication cadence:

```sh
npm run acquisition:plan -- --run-id=run-2026-12-17 --evidence-days=75
```

Additional sources are recorded as candidates and must receive an explicit accepted or rejected evaluation. Acceptance can propose a later registry change, but these commands never edit the permanent registries.

Candidate generation requires both `normalized.jsonl` and `derived-metrics.json` to have been written. It stores up to 20 candidates, with no minimum. Review challenges every candidate and separates surviving results from rejected or insufficient interpretations:

```sh
npm run findings:generate -- --run-id=run-2026-12-17
npm run findings:challenge -- --run-id=run-2026-12-17
```

The monthly workflow runs these stages through `npm run report:generate`. It also preserves `collected-report.json`, including stable metric IDs, source display values, statistical observations and talent references, so report writing cannot erase the dashboard data.

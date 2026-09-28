# Game Industry Observatory

Static and fully AI-assisted webpage that observes the 'state' of the games industry.

https://phendriks.github.io/state-of-game-industry/

- The stored research flow is **source → observation → interpretation**.
- The reading flow is **interpretation → observation → source → origin or relationship**.

## Report publishing

- The homepage automatically renders the latest monthly report.
- `src/data/reports/YYYY-MM-DD.md` provides permanent historical report pages.
- `/history/` tracks published reports.
- `src/data/newsSources.ts` and `src/data/statisticalSources.ts` are the canonical source registries.
- `/submit-source/` guides contributors through a reviewable pull request.
- Reports are `human_reviewed: false` unless a person has verified report validity.

## Monthly automation

The GitHub Actions workflow runs at 06:17 Europe/Amsterdam on the 24th of each month. The report covers the 24th of the preceding month through the 23rd of the publication month. All API stages use `gpt-6-luna` with medium reasoning, configured in `src/data/reportConfig.ts`. The workflow does not read the `OPENAI_MODEL` repository variable, so a stale Actions setting cannot override the shared model. Local runs can still override the model with the `OPENAI_MODEL` environment variable.

Leave the manual `report_date` input blank to use the most recent 24th in Amsterdam. For example, a dry run on 28 September uses 24 September; one on 10 October also uses 24 September. An explicit `YYYY-MM-24` input selects that publication date instead. Generation and validation use the same date resolver.

Each run collects evidence from the canonical registries, validates atomic observations, calculates compatible metrics, generates candidate findings, challenges those findings, writes one report and validates the complete run. These are separate API requests within one monthly publication. Finding counts and summary length are not publication requirements. Missing indicators remain missing, and eligible prior observations retain their original dates.

Finding review constrains source IDs to approved registry or accepted-candidate IDs. An observation/source ID mix-up is corrected only when the exact URL matches a validated observation. Unapproved sources, URL mismatches, missing or duplicate reviews, and malformed individual reviews produce warnings and exclude only the affected findings, rather than blocking the report. Unknown finding IDs are ignored with warnings. `finding-review-diagnostics.json` retains the original reviews, corrections and exclusions in the run evidence; the report never uses an excluded review's conclusion. A run can publish with no surviving findings, using its collected observations and explicit missing-data states.

The acquisition plan records a 75-day research context window. New regular report metrics must still be published inside the monthly reporting window; older official statistics and retained observations are separately classified as context or historical evidence. Aggregate job and layoff totals are not treated as individual job postings or event records.

After validation, publication builds the site with the report and archives all evidence under `data/evidence/report-YYYY-MM-24/`. Scheduled runs commit both together and deploy to GitHub Pages. Manual runs default to **dry run**: they build the site and upload the report and evidence as an Actions artifact, without committing or deploying. Failed runs also upload their available diagnostics.

To run locally:

```sh
npm install
npm run report:generate -- --report-date=2026-10-24
# Use the run_id printed by generation:
npm run pipeline:publish -- --run-id=<run_id>
```

Generation writes a new ignored workspace under `data/runs/` and leaves published reports untouched. Publication checks the validation and anomaly gates, copies the report locally, builds the site and archives its evidence. It restores the previous report if the build fails. It does not commit unless explicitly given `--commit=true`, and never pushes.

OpenAI authentication uses the shared helper in `scripts/pipeline-openai.mjs`. GitHub Actions uses the existing workload identity variables (`OPENAI_WIF_AUDIENCE`, `OPENAI_IDENTITY_PROVIDER_ID`, `OPENAI_SERVICE_ACCOUNT_ID`); local runs can use `OPENAI_API_KEY`. Each client queues requests one at a time, spaces their start times by at least 15 seconds, and respects capacity/reset headers when token or request headroom runs low. Temporary rate limits and overload retry up to six attempts with server-directed waits or backoff. Each request has a 10-minute cumulative wait budget; a longer server cooldown stops the request rather than retrying early. Quota and billing failures stop immediately. Pacing reduces bursts but cannot guarantee no rate limits, especially when web searches consume tokens or other processes share the account limits.

The evidence pipeline tests run without paid API calls. `npm run monthly:test` exercises collection, missing-data handling, validation, archival and publication failure recovery. The individual stage test commands remain available in `package.json`.

## AI and coverage disclosure

Reports are generated using ChatGPT-assisted semi-automated aggregation and are not represented as hand-collected journalism. Research may use non-English sources while producing clear English output. It must retain the original source, scope, meaning and uncertainty. It must not combine incompatible populations, invent independence, treat repeated reporting as separate support, create source-quality scores or create a composite industry score. Data, source material, extraction, classification and summaries may contain errors.

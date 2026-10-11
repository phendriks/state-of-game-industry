# Game Industry Observatory

Static and fully AI-assisted webpage that observes the 'state' of the games industry

Available here: https://phendriks.github.io/state-of-game-industry/

- Reading flow: **interpretation → observation → source → origin or relationship**
- Research flow: **source → collection → observation → interpretation**

## Report publishing

- Report are stored under: `src/data/reports/YYYY-MM-DD.md`
- Sources are stored under: `src/data/newsSources.ts` and `src/data/statisticalSources.ts`
- New source contributions here: `/submit-source/`
- Reports are `human_reviewed: false` unless a person has verified report validity.

## Monthly automation

The GitHub Actions workflow runs at 06:17 Europe/Amsterdam on the 24th of each month. The report covers the 24th of the preceding month through the 23rd of the publication month. The information acquisition records a 75-day window. Each run collects evidence, validates observations, calculates metrics, generates findings, writes a report and validates the run.  After validation, publication builds the site with the report and archives evidence under `data/evidence/report-YYYY-MM-24/`. 

- OpenAI authentication uses the shared helper in `scripts/pipeline-openai.mjs`.
- GitHub Actions uses the existing workload identity variables.
- Temporary rate limits and overload retry up to six attempts with server-directed waits or backoff.

## AI and coverage disclosure

Reports are generated using ChatGPT-assisted semi-automated aggregation and are not represented as hand-collected journalism. Research may use non-English sources while producing clear English output. It must retain the original source, scope, meaning and uncertainty. It must not combine incompatible populations, invent independence, treat repeated reporting as separate support, create source-quality scores or create a composite industry score. Data, source material, extraction, classification and summaries may contain errors.

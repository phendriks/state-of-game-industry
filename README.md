# Game Industry Observatory

Static and fully AI-assisted webpage that observes the 'state' of the games industry.

https://phendriks.github.io/state-of-game-industry/

- The stored research flow is **source → observation → interpretation**.
- The reading flow is **interpretation → observation → source → origin or relationship**.

## Report publishing

- The homepage automatically renders the latest monthly report.
- `src/data/reports/YYYY-MM-DD.md` provides permanent historical report pages.
- `/history/` tracks published reports.
- `/newsSources.ts` is the source registry.
- `/submit-source/` guides contributors through a reviewable pull request.
- Reports are `human_reviewed: false` unless a person has verified report validity.

## Monthly automation

Each monthly automation..:
- ..runs on the 24th of each month and uses `gpt-6-luna` with medium reasoning;
- ..covers the 24th of the preceding month through the 23rd of the publication month;
- ..generated a validated report, then builds and deploys to the site.

Older observations can be carried forward for a category-specific period without changing their observation date. A failed collection, validation or build does not commit or deploy anything.

## AI and coverage disclosure

Reports are generated using ChatGPT-assisted semi-automated aggregation and are not represented as hand-collected journalism. Research may use non-English sources while producing clear English output. It must retain the original source, scope, meaning and uncertainty. It must not combine incompatible populations, invent independence, treat repeated reporting as separate support, create source-quality scores or create a composite industry score. Data, source material, extraction, classification and summaries may contain errors.

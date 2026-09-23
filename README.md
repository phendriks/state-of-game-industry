# Game Industry Observatory

https://phendriks.github.io/state-of-game-industry/

A static, AI-assisted games-industry health dashboard built from individually inspectable Markdown reports.

## Publishing model

- `src/data/reports/YYYY-MM-DD.md` is the canonical artifact for each observation period.
- The homepage automatically renders the latest bi-weekly report.
- `/reports/YYYY-MM-DD/` provides permanent historical report pages.
- `/history/` tracks the raw reported, forecast and estimated metrics stored with each report; it does not calculate a composite index.
- `src/data/newsSources.ts` is the canonical source registry and required starting input for every reporting run.
- `/sources/` publishes that registry; `/submit-source/` guides contributors through a reviewable pull request.
- GitHub is used to keep history of every report and methodology change.

Set `human_reviewed: true` only after a person has checked the report. A non-empty `reviewer` name is then required by the content schema; leave the review flag `false` and omit `reviewer` otherwise.

Source suggestions are proposed as edits to `NEWS_SOURCE_CATEGORIES`. The repository owner reviews each pull request before merging it. Keeping collection inputs and the public Sources page in the same file makes source-list changes and contributors inspectable in Git history.

## AI and coverage disclosure

Reports are generated using ChatGPT-assisted semi-automated aggregation and are not represented as hand-collected journalism. Current source coverage is disproportionately English-language, North American and European / Western-facing. Asian and other non-Western markets are not covered with equivalent depth. Data, source material, extraction, classification, sentiment analysis and AI summaries may contain errors.

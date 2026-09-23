# Game Industry Observatory

https://phendriks.github.io/state-of-game-industry/

A static, AI-assisted games-industry health dashboard built from individually inspectable Markdown reports.

## Publishing model

- `src/data/reports/YYYY-MM-DD.md` is the canonical artifact for each observation period.
- The homepage automatically renders the latest bi-weekly report.
- `/reports/YYYY-MM-DD/` provides permanent historical report pages.
- `/history/` renders longitudinal views from the report collection.
- `src/data/newsSources.ts` is the canonical source registry and required starting input for every reporting run.
- `/sources/` publishes that registry; `/submit-source/` turns public suggestions into reviewable GitHub issues.
- GitHub is used to keep history of every report and methodology change.

Accepted source suggestions should be added to `NEWS_SOURCE_CATEGORIES` before the next report is generated. Keeping collection inputs and the public Sources page in the same file makes source-list changes inspectable in Git history.

## AI and coverage disclosure

Reports are generated using ChatGPT-assisted semi-automated aggregation and are not represented as hand-collected journalism. Current source coverage is disproportionately English-language, North American and European / Western-facing. Asian and other non-Western markets are not covered with equivalent depth. Data, source material, extraction, classification, sentiment analysis and AI summaries may contain errors.

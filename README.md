# Game Industry Observatory

https://phendriks.github.io/state-of-game-industry/

A static, AI-assisted games-industry health dashboard built from individually inspectable Markdown reports.

## Publishing model

- `src/data/reports/YYYY-MM-DD.md` is the canonical artifact for each observation period.
- The homepage automatically renders the latest bi-weekly report.
- `/reports/YYYY-MM-DD/` provides permanent historical report pages.
- `/history/` tracks reported, calculated, forecast and estimated metrics stored with each report; it does not calculate a composite index.
- `src/data/newsSources.ts` is the canonical source registry and required starting input for every reporting run.
- Each metric uses an exact source name from that registry and records its scope and observation date. An unregistered source fails validation.
- `/sources/` publishes that registry; `/submit-source/` guides contributors through a reviewable pull request.
- GitHub is used to keep history of every report and methodology change.

Set `human_reviewed: true` only after a person has checked the report. A non-empty `reviewer` name is then required by the content schema; leave the review flag `false` and omit `reviewer` otherwise.

Source suggestions are proposed as edits to `NEWS_SOURCE_CATEGORIES`. The repository owner reviews each pull request before merging it. Keeping collection inputs and the public Sources page in the same file makes source-list changes and contributors inspectable in Git history.

## Report authoring

Write a single industry summary in the Markdown body. Put every numeric observation in the frontmatter `metrics` list; the snapshot, detailed tables and hard-data history are generated from that one list.

Use stable metric IDs between reports. A later report can add job-listing flow and survival, Steam activity breadth, company formation, public-company financial facts and international-talent demand without rewriting historical reports. Do not report a change until two compatible observations exist.

`Calculated` metrics require a plain-language formula and at least two stored inputs. Removed job listings are not described as filled roles, platform activity is not described as market revenue, and legal-entity registrations are not described as studio openings without qualification.

## AI and coverage disclosure

Reports are generated using ChatGPT-assisted semi-automated aggregation and are not represented as hand-collected journalism. Current source coverage is disproportionately English-language, North American and European / Western-facing. Asian and other non-Western markets are not covered with equivalent depth. Data, source material, extraction, classification, sentiment analysis and AI summaries may contain errors.

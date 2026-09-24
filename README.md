# Game Industry Observatory

https://phendriks.github.io/state-of-game-industry/

A static, AI-assisted observatory built from individually inspectable sources and observations.

- The stored research flow is **source → observation → interpretation**.
- The reading flow is **interpretation → observation → source → origin or relationship**.

## Publishing model

- `src/data/reports/YYYY-MM-DD.md` is the canonical artifact for each observation period.
- The homepage automatically renders the latest monthly report.
- `/reports/YYYY-MM-DD/` provides permanent historical report pages.
- `/history/` tracks reported, calculated, forecast and estimated metrics stored with each report; it does not calculate a composite index.
- `src/data/newsSources.ts` is the canonical source registry and required starting input for every reporting run.
- Each metric uses an exact source name from that registry and records its scope and observation date. An unregistered source fails validation.
- `/sources/` publishes that registry; `/submit-source/` guides contributors through a reviewable pull request.
- GitHub is used to keep history of every report and methodology change.

Set `human_reviewed: true` only after a person has checked the report. A non-empty `reviewer` name is then required by the content schema; leave the review flag `false` and omit `reviewer` otherwise.

Source suggestions are proposed as edits to `NEWS_SOURCE_CATEGORIES`. The repository owner reviews each pull request before merging it. Keeping collection inputs and the public Sources page in the same file makes source-list changes and contributors inspectable in Git history.

A source proposal only needs a name, canonical URL, simple type and optional note. Coverage, cadence, language and geographic details can be added during review. Source type and affiliation are context, not scores.

## Monthly automation

`.github/workflows/monthly-report.yml` runs on the 24th of each month in the Europe/Amsterdam timezone. It covers the 24th of the preceding month through the 23rd of the publication month, validates the resulting report, builds the site, commits the canonical Markdown artifact and deploys that same build. Manual runs default to a non-publishing dry run.

The preferred authentication method is OpenAI workload identity federation. Configure the repository variables `OPENAI_WIF_AUDIENCE`, `OPENAI_IDENTITY_PROVIDER_ID` and `OPENAI_SERVICE_ACCOUNT_ID`. A repository secret named `OPENAI_API_KEY` is supported as a fallback. `OPENAI_MODEL` is optional and defaults to `gpt-5.4-mini`.

Collection is deliberately fail-closed. New observations require an exact registered source name, a publication date inside the monthly window, an evidence URL on the registered source's domain and an evidence excerpt. Older observations can be carried forward for a category-specific period without changing their observation date. A failed collection, validation or build does not commit or deploy anything.

## AI and coverage disclosure

Reports are generated using ChatGPT-assisted semi-automated aggregation and are not represented as hand-collected journalism. Research may use non-English sources while producing clear English output. It must retain the original source, scope, meaning and uncertainty. It must not combine incompatible populations, invent independence, treat repeated reporting as separate support, create source-quality scores or create a composite industry score. Data, source material, extraction, classification and summaries may contain errors.

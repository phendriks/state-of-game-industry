# Game Industry Observatory

A static, AI-assisted games-industry health dashboard built from individually inspectable Markdown reports.

## Publishing model

- `src/data/reports/YYYY-MM-DD.md` is the canonical artifact for each observation period.
- The homepage automatically renders the newest report.
- `/reports/YYYY-MM-DD/` provides permanent historical report pages.
- `/history/` renders longitudinal views from the report collection.
- GitHub keeps a complete version history of every report and methodology change.

## AI and coverage disclosure

Reports are generated using ChatGPT-assisted automated/semi-automated aggregation and are not represented as hand-collected journalism. Current source coverage is disproportionately English-language, North American and European / Western-facing. Asian and other non-Western markets are not yet covered with equivalent depth. Data, source material, extraction, classification, sentiment analysis and AI summaries may contain errors.

## Local development

```bash
npm install
npm run dev
```

## Deployment

The repository includes a GitHub Pages workflow under `.github/workflows/deploy.yml`.
After the first push, set **Settings → Pages → Source → GitHub Actions** if GitHub does not select it automatically.

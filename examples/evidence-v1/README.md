# Evidence schema v1 example

`observations.jsonl` is a standalone atomic observation. It records the value, period, geography, retrieval time, provenance and interpretation-free normalized claim needed to reconstruct the fact without opening a final report.

`original_value` preserves the publisher's representation while `value` stores the normalized value. `evidence_class` keeps rolling-window evidence distinct from context and historical baselines.

Validate it with:

```sh
npm run evidence:validate -- --type=observations --file=examples/evidence-v1/observations.jsonl
```

`source_id` identifies the page or record actually consulted. `underlying_source_id` identifies a different original source when the consulted source repeats another publisher's evidence. It is `null` when the consulted source is itself the origin. Repeated coverage should therefore retain separate `source_id` values but share one `underlying_source_id`.

Schema `1.0.0` is intentionally limited to evidence structure. Run workspaces, acquisition, reconciliation, derived metrics and publication gates belong to later phases.

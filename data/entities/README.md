# Canonical entity spine

`entities.v1.json` assigns stable identities to parent companies, publishers, developers, studios, games and franchises. Aliases resolve source wording to one canonical entity before events are reconciled. Unknown or ambiguous aliases fail reconciliation and must be reviewed rather than guessed.

Event reconciliation groups matching event type, canonical entities, date and geography, then preserves every supporting observation ID on one event.

Job fingerprints use canonical company identity, normalized title, normalized location and an ATS identifier when available, otherwise the posting URL. Job lifecycle reconciliation expects each input to be a complete snapshot for its declared collection scope; partial crawls must not be used to infer closures.

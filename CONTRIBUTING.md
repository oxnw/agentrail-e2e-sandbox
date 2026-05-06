# Contributing

This repository is optimized for realistic provider-backed validation, not for product delivery.

## Ground rules

- Keep benchmark tasks deterministic and acceptance-criteria-driven
- Treat `scenarios/manifest.json` and `benchmarks/catalog.json` as source-of-truth documents
- Do not use `main` for destructive ship and rollback tests
- Prefer scenario-specific changes over ad hoc fixture files

## Pull requests

Every pull request should include:

- linked issue or benchmark task
- scenario impact
- tests run
- risk summary
- rollback plan when GitHub state must be reseeded

## Scenario changes

If a change modifies the scenario contract, update:

- `scenarios/manifest.json`
- `docs/scenarios.md`
- any related benchmark entries or issue templates

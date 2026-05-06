# Agent Instructions

This repository exists to support AgentRail benchmark testing and live end-to-end provider validation.

## What this repo is for

- Benchmark corpus for AgentRail vs non-AgentRail engineering tasks
- Stable seeded GitHub scenarios for CI and review reads
- Disposable scratch lane for destructive ship and rollback validation

## Canonical files

- `scenarios/manifest.json` is the scenario source of truth
- `benchmarks/catalog.json` is the benchmark task source of truth
- `docs/scenarios.md` explains the operational contract for live runs

## Branch model

- `main`: protected, realism-focused default branch
- `integration/live`: disposable integration branch for live ship and rollback
- seeded scenario branches: long-lived branches backing open PR scenarios
- `scratch/*`: disposable branches for new functionality and destructive E2E validation

## Expectations for agents

- Prefer benchmark tasks that are deterministic and acceptance-criteria-driven
- Keep seeded scenarios stable unless intentionally refreshing GitHub state
- Use `integration/live` rather than `main` for ship and rollback validation
- Update the manifests and docs when scenario semantics change

## Ship gate

AgentRail should only ship live sandbox work when:

1. The selected scenario allows shipping
2. CI is green
3. Review outcome is approved
4. The target branch is the disposable integration branch unless explicitly testing a new policy

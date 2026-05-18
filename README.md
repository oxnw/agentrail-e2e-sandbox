# agentrail-e2e-sandbox

Scenario-driven sandbox repository for AgentRail live-provider validation and benchmark comparisons.

This repository is intentionally small enough to maintain, but realistic enough to exercise:

- GitHub issue intake
- pull request submit and reuse
- CI status reads across multiple workflows
- review feedback reads
- ship and rollback on a disposable integration branch
- deterministic benchmark tasks for AgentRail vs non-AgentRail runs

## Repository shape

This is an `npm` workspace mini-monorepo:

- `apps/api`: small HTTP service and API-level integration tests
- `packages/task-engine`: lifecycle and task normalization logic
- `packages/contracts`: shared contracts, task metadata, and scenario types

## Scenario contract

The sandbox is driven by two checked-in manifests:

- `scenarios/manifest.json`: named live-provider scenarios
- `benchmarks/catalog.json`: deterministic benchmark tasks and scoring expectations

Read [docs/scenarios.md](docs/scenarios.md) for the canonical seeded scenario metadata and how it maps onto the `AGENTRAIL_SANDBOX_*` environment variables used by AgentRail's live smoke scripts.

## Usage

```bash
npm install
npm run lint
npm run scenario:validate
npm run catalog:validate
npm test
```

## Current scenario lanes

- `golden-open`: open PR with green CI and approved review
- `failing-open`: open PR with deterministic failing CI and requested changes
- `flaky-open`: open PR with rerun or prior-pass history for flaky hints
- `scratch-live-cycle`: disposable lane for intake, submit, ship into `integration/live`, rollback, and cleanup

## Benchmark model

The repository defines benchmark tasks and scoring rules, but does not execute benchmark runs itself. External runners should consume the checked-in catalog and compare:

- AgentRail-assisted execution
- non-AgentRail execution

That keeps the repo stable while preserving a shared scoring contract.

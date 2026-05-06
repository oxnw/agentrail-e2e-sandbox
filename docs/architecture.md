# Architecture

`agentrail-e2e-sandbox` is a scenario-driven mini-monorepo. The code exists to make GitHub lifecycle state feel credible, not to serve a production application.

## Workspaces

### `apps/api`

Small Node HTTP service that exposes task and benchmark information. It gives benchmark tasks a real API surface and creates a place for integration tests and lifecycle-facing bugs.

### `packages/task-engine`

Shared lifecycle logic for:

- issue normalization
- priority classification
- review gate derivation
- CI summary interpretation
- action recommendation

### `packages/contracts`

Shared contracts and validation helpers for:

- scenarios
- benchmark tasks
- task snapshots
- CI and review metadata

## Why this shape

The repo needs enough structure to create realistic change sets:

- package-local fixes
- cross-package contract changes
- API behavior changes
- workflow and metadata changes

At the same time, it must remain cheap to reseed when GitHub fixture state drifts.

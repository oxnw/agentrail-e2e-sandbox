# Agent Instructions

This repository is used by AgentRail for live end-to-end provider validation (AGEA-50).

## What agents should know

- Branch `feature/agea-50-e2e-validation` is the sandbox PR target for AgentRail CI/review reads
- The CI workflow in `.github/workflows/ci.yml` runs a passing validation check on each push
- Review feedback is sourced from this PR by the AgentRail review feedback adapter

## Ship gate

AgentRail will only call `POST /tasks/{id}/ship` when:
1. CI is green (all checks pass)
2. Review outcome is `approved`
3. `availableActions` includes `ship`

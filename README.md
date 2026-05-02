# agentrail-e2e-sandbox

Disposable sandbox repository for AgentRail live provider E2E validation.

This repo exists to give AgentRail tooling a real GitHub repository to read CI status
and PR review feedback from, without touching production code.

## Purpose

- Real GitHub Actions CI workflows for AgentRail `GET /tasks/{id}/ci-status` to read
- Real pull requests for `GET /tasks/{id}/review-feedback` to read
- Sandboxed: no production deploys, no sensitive data

## Usage

Part of [AGEA-50](https://github.com/oxnw/agentrail/issues) live provider E2E validation.

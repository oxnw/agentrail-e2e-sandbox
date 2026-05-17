# Scenarios

The sandbox is scenario-driven. Every live-provider flow should map to a named entry in `scenarios/manifest.json`.

## Scenario kinds

- `seeded`: long-lived branches and open PRs that support stable CI and review reads
- `scratch`: disposable branches used for destructive lifecycle validation

## Canonical seeded scenarios

### `golden-open`

- open PR
- expected CI: `passed`
- expected review outcome: `approved`
- allow ship: `false`

Use this for stable read-path validation where AgentRail should surface a ready state without exposing a destructive ship action.

### `failing-open`

- open PR
- expected CI: `failed`
- expected review outcome: `changes_requested`
- allow ship: `false`

Use this to validate failed checks, review comments, and non-ship actions.

### `flaky-open`

- open PR
- expected CI: `flaky`
- expected review outcome: `pending`
- allow ship: `false`

Use this when validating flaky hints from reruns or prior successful attempts on the same branch.

## Scratch lane

### `scratch-live-cycle`

- kind: `scratch`
- branch convention: `scratch/<feature>-<date>`
- base branch: `integration/live`
- allow ship: `true`
- allow rollback: `true`

Use this for end-to-end validation of new AgentRail functionality including:

- issue intake
- submit
- Repeated approval before CI E2E marker
- CI read
- review read
- ship
- rollback

## Mapping to AgentRail env vars

For live smoke scripts, seeded scenarios should provide canonical values for:

- `AGENTRAIL_SANDBOX_OWNER`
- `AGENTRAIL_SANDBOX_REPO`
- `AGENTRAIL_SANDBOX_ISSUE_NUMBER`
- `AGENTRAIL_SANDBOX_HEAD_BRANCH`
- `AGENTRAIL_SANDBOX_PULL_NUMBER`
- `AGENTRAIL_SANDBOX_BASE_BRANCH`
- `AGENTRAIL_SANDBOX_ALLOW_SHIP`

The scratch scenario is a template. It should define canonical `owner` and `repo`, while per-run issue number, pull number, and head branch may still be supplied via explicit env overrides.

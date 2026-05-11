import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskSnapshot, deriveReviewGate, mergeIssueUpdate } from "../src/index.js";
import type { IssueSnapshot } from "../src/index.js";

test("deriveReviewGate blocks ship when CI is failing", () => {
  const result = deriveReviewGate({ ciStatus: "failed", reviewOutcome: "approved" });
  assert.equal(result.status, "todo");
  assert.deepEqual(result.availableActions, ["submit", "view_ci_status"]);
});

test("deriveReviewGate exposes ship for passed and approved state", () => {
  const result = deriveReviewGate({ ciStatus: "passed", reviewOutcome: "approved" });
  assert.equal(result.status, "ready_to_ship");
  assert.deepEqual(result.availableActions, ["view_ci_status", "ship"]);
});

test("deriveReviewGate hides ship for approved seeded scenarios with allowShip false", () => {
  const result = deriveReviewGate({ ciStatus: "passed", reviewOutcome: "approved", allowShip: false });
  assert.equal(result.status, "ready_to_ship");
  assert.deepEqual(result.availableActions, ["view_ci_status", "view_review_feedback"]);
});

test("buildTaskSnapshot reflects rollback eligibility from scenario", () => {
  const snapshot = buildTaskSnapshot({
    task: {
      id: "bm_crosspkg_rollback_audit",
      title: "Rollback task",
      issueSlug: "benchmark-rollback-eligibility-audit",
      scenarioId: "scratch-live-cycle",
      priority: "high",
      packages: ["apps/api"],
      taskType: "cross_cutting",
      acceptanceCriteria: ["x"],
      expectedChangedPaths: ["apps/api/src/server.ts"],
      requiredChecks: ["CI / Unit Tests"],
      requiredArtifacts: ["pull_request"],
      scoring: { correctness: 1 }
    },
    scenario: {
      id: "scratch-live-cycle",
      kind: "scratch",
      issueSlug: "scratch-live-cycle-template",
      branch: "scratch/<feature>-<date>",
      baseBranch: "integration/live",
      shipTargetBranch: "integration/live",
      expectedCiStatus: "variable",
      expectedReviewOutcome: "variable",
      allowSubmit: true,
      allowShip: true,
      allowRollback: true,
      live: {
        owner: "oxnw",
        repo: "agentrail-e2e-sandbox"
      },
      notes: "scratch"
    }
  });

  assert.equal(snapshot.rollbackEligible, true);
  assert.equal(snapshot.priority, "high");
});

test("buildTaskSnapshot keeps seeded ready state while suppressing ship action", () => {
  const snapshot = buildTaskSnapshot({
    task: {
      id: "bm_seeded_ready",
      title: "Seeded ready task",
      issueSlug: "benchmark-seeded-ready",
      scenarioId: "golden-open",
      priority: "medium",
      packages: ["apps/api"],
      taskType: "feature",
      acceptanceCriteria: ["x"],
      expectedChangedPaths: ["apps/api/src/server.ts"],
      requiredChecks: ["CI / Unit Tests"],
      requiredArtifacts: ["pull_request"],
      scoring: { correctness: 1 }
    },
    scenario: {
      id: "golden-open",
      kind: "seeded",
      issueSlug: "benchmark-api-timeout-policy",
      branch: "scenario/golden-open",
      baseBranch: "main",
      shipTargetBranch: "integration/live",
      expectedCiStatus: "passed",
      expectedReviewOutcome: "approved",
      allowSubmit: true,
      allowShip: false,
      allowRollback: false,
      live: {
        owner: "oxnw",
        repo: "agentrail-e2e-sandbox",
        issueNumber: 1,
        pullNumber: 1,
        headBranch: "scenario/golden-open"
      },
      notes: "seeded"
    }
  });

  assert.equal(snapshot.status, "ready_to_ship");
  assert.deepEqual(snapshot.availableActions, ["view_ci_status", "view_review_feedback"]);
});

test("mergeIssueUpdate preserves labels and assignee for sparse open issue updates", () => {
  const existing: IssueSnapshot = {
    number: 19,
    title: "Preserve context",
    state: "open",
    labels: [{ id: 1, name: "benchmark", color: "0e8a16" }],
    assignee: { id: 2, login: "agentrail-bot", htmlUrl: "https://github.com/agentrail-bot" },
    updatedAt: "2026-05-11T20:00:00Z"
  };

  const result = mergeIssueUpdate(existing, {
    title: "Preserve task context across sparse issue updates",
    state: "open",
    updatedAt: "2026-05-11T21:00:00Z"
  });

  assert.equal(result.title, "Preserve task context across sparse issue updates");
  assert.equal(result.state, "open");
  assert.deepEqual(result.labels, existing.labels);
  assert.deepEqual(result.assignee, existing.assignee);
});

test("mergeIssueUpdate preserves labels and assignee for sparse closed issue updates", () => {
  const existing: IssueSnapshot = {
    number: 19,
    title: "Preserve context",
    state: "open",
    labels: [{ id: 1, name: "benchmark", color: "0e8a16" }],
    assignee: { id: 2, login: "agentrail-bot", htmlUrl: "https://github.com/agentrail-bot" },
    updatedAt: "2026-05-11T20:00:00Z",
    closedAt: null
  };

  const result = mergeIssueUpdate(existing, {
    state: "closed",
    updatedAt: "2026-05-11T22:00:00Z",
    closedAt: "2026-05-11T22:00:00Z"
  });

  assert.equal(result.state, "closed");
  assert.equal(result.closedAt, "2026-05-11T22:00:00Z");
  assert.deepEqual(result.labels, existing.labels);
  assert.deepEqual(result.assignee, existing.assignee);
});

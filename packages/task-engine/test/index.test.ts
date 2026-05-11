import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskSnapshot, deriveReviewGate, ingestIssueUpdate } from "../src/index.js";

function existingIssue(state: "open" | "closed") {
  return {
    id: 1600,
    number: 16,
    title: "Preserve task context across sparse issue updates",
    state,
    labels: [
      { id: 101, name: "benchmark", color: "0366d6", description: "Benchmark task" },
      { id: 102, name: "task-engine", color: "0e8a16", description: null }
    ],
    assignee: {
      id: 501,
      login: "agentrail-bot",
      htmlUrl: "https://github.com/agentrail-bot"
    },
    assignees: [
      {
        id: 501,
        login: "agentrail-bot",
        htmlUrl: "https://github.com/agentrail-bot"
      }
    ],
    updatedAt: "2026-05-11T10:00:00.000Z",
    closedAt: state === "closed" ? "2026-05-11T11:00:00.000Z" : null
  };
}

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

test("ingestIssueUpdate keeps labels when open issue update omits labels", () => {
  const issue = existingIssue("open");

  const result = ingestIssueUpdate(issue, {
    number: 16,
    title: "Updated open issue title",
    state: "open",
    updatedAt: "2026-05-11T12:00:00.000Z"
  });

  assert.deepEqual(result.labels, issue.labels);
  assert.equal(result.title, "Updated open issue title");
  assert.equal(result.state, "open");
});

test("ingestIssueUpdate keeps assignee metadata when open issue update omits assignees", () => {
  const issue = existingIssue("open");

  const result = ingestIssueUpdate(issue, {
    number: 16,
    state: "open",
    updatedAt: "2026-05-11T12:00:00.000Z"
  });

  assert.deepEqual(result.assignee, issue.assignee);
  assert.deepEqual(result.assignees, issue.assignees);
});

test("ingestIssueUpdate keeps labels when closed issue update omits labels", () => {
  const issue = existingIssue("closed");

  const result = ingestIssueUpdate(issue, {
    number: 16,
    title: "Closed issue update",
    state: "closed",
    closedAt: "2026-05-11T12:30:00.000Z",
    updatedAt: "2026-05-11T12:00:00.000Z"
  });

  assert.deepEqual(result.labels, issue.labels);
  assert.equal(result.closedAt, "2026-05-11T12:30:00.000Z");
  assert.equal(result.state, "closed");
});

test("ingestIssueUpdate keeps assignee metadata when closed issue update omits assignees", () => {
  const issue = existingIssue("closed");

  const result = ingestIssueUpdate(issue, {
    number: 16,
    state: "closed",
    updatedAt: "2026-05-11T12:00:00.000Z"
  });

  assert.deepEqual(result.assignee, issue.assignee);
  assert.deepEqual(result.assignees, issue.assignees);
  assert.equal(result.state, "closed");
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

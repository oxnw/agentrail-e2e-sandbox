import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskSnapshot, deriveReviewGate, mergeGitHubIssueUpdate } from "../src/index.js";

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

test("mergeGitHubIssueUpdate keeps labels and assignees for sparse open issue updates", () => {
  const current = {
    number: 15,
    title: "Preserve task context",
    state: "open" as const,
    labels: [{ id: "label-1", name: "enhancement", color: "a2eeef" }],
    assignee: { id: "user-1", login: "octocat", name: "Mona" },
    assignees: [{ id: "user-1", login: "octocat", name: "Mona" }]
  };

  const updated = mergeGitHubIssueUpdate(current, {
    title: "Preserve sparse issue context",
    state: "open"
  });

  assert.equal(updated.title, "Preserve sparse issue context");
  assert.equal(updated.state, "open");
  assert.deepEqual(updated.labels, current.labels);
  assert.deepEqual(updated.assignee, current.assignee);
  assert.deepEqual(updated.assignees, current.assignees);
});

test("mergeGitHubIssueUpdate keeps labels and assignees for sparse closed issue updates", () => {
  const current = {
    number: 15,
    title: "Preserve task context",
    state: "open" as const,
    labels: [{ id: "label-1", name: "enhancement", color: "a2eeef" }],
    assignee: { id: "user-1", login: "octocat", name: "Mona" },
    assignees: [{ id: "user-1", login: "octocat", name: "Mona" }]
  };

  const updated = mergeGitHubIssueUpdate(current, {
    state: "closed"
  });

  assert.equal(updated.title, "Preserve task context");
  assert.equal(updated.state, "closed");
  assert.deepEqual(updated.labels, current.labels);
  assert.deepEqual(updated.assignee, current.assignee);
  assert.deepEqual(updated.assignees, current.assignees);
});

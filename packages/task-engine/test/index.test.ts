import test from "node:test";
import assert from "node:assert/strict";
import { buildTaskSnapshot, deriveReviewGate, ingestIssueUpdate, mergeIssueUpdate } from "../src/index.js";

interface IssueFixture {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: Array<{ id: number; name: string }>;
  assignee: { id: number; login: string };
  assignees: Array<{ id: number; login: string }>;
  body?: string;
  closedAt?: string;
}

type IssueUpdate = Partial<IssueFixture>;

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

test("ingestIssueUpdate keeps labels and assignee metadata when an open issue update omits them", () => {
  const existing: IssueFixture = {
    number: 15,
    title: "Preserve sparse issue context",
    state: "open",
    labels: [
      { id: 1, name: "agentrail" },
      { id: 2, name: "benchmark" }
    ],
    assignee: { id: 42, login: "benchmark-agent" },
    assignees: [{ id: 42, login: "benchmark-agent" }],
    body: "Initial issue body"
  };

  const result = ingestIssueUpdate(existing, {
    title: "Preserve task context across sparse issue updates",
    body: "Updated issue body"
  } satisfies IssueUpdate);

  assert.equal(result.title, "Preserve task context across sparse issue updates");
  assert.equal(result.state, "open");
  assert.deepEqual(result.labels, existing.labels);
  assert.deepEqual(result.assignee, existing.assignee);
  assert.deepEqual(result.assignees, existing.assignees);
});

test("mergeIssueUpdate keeps labels and assignee metadata when a sparse update closes an issue", () => {
  const existing: IssueFixture = {
    number: 15,
    title: "Preserve sparse issue context",
    state: "open",
    labels: [
      { id: 1, name: "agentrail" },
      { id: 2, name: "benchmark" }
    ],
    assignee: { id: 42, login: "benchmark-agent" },
    assignees: [{ id: 42, login: "benchmark-agent" }]
  };

  const result = mergeIssueUpdate(existing, {
    state: "closed",
    closedAt: "2026-05-12T14:00:00.000Z"
  } satisfies IssueUpdate);

  assert.equal(result.state, "closed");
  assert.equal(result.closedAt, "2026-05-12T14:00:00.000Z");
  assert.deepEqual(result.labels, existing.labels);
  assert.deepEqual(result.assignee, existing.assignee);
  assert.deepEqual(result.assignees, existing.assignees);
});

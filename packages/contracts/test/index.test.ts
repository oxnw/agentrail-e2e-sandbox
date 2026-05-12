import test from "node:test";
import assert from "node:assert/strict";
import { normalizePriorityLabel, validateBenchmarkTask, validateScenarioDefinition } from "../src/index.js";

test("normalizePriorityLabel maps aliases", () => {
  assert.equal(normalizePriorityLabel("p0"), "critical");
  assert.equal(normalizePriorityLabel("P1"), "high");
  assert.equal(normalizePriorityLabel("default"), "medium");
  assert.equal(normalizePriorityLabel("p2"), "low");
});

test("normalizePriorityLabel handles label edge cases", () => {
  assert.equal(normalizePriorityLabel(" CRIT "), "critical");
  assert.equal(normalizePriorityLabel("sev-1"), "high");
  assert.equal(normalizePriorityLabel("Severity 2"), "medium");
  assert.equal(normalizePriorityLabel("sev_3"), "low");
});

test("normalizePriorityLabel rejects unknown values", () => {
  assert.throws(() => normalizePriorityLabel("urgent"));
});

test("validateBenchmarkTask normalizes priority metadata", () => {
  const task = validateBenchmarkTask({
    id: "bm-priority",
    title: "Priority labels",
    issueSlug: "priority-labels",
    scenarioId: "golden-open",
    priority: "P-1",
    packages: ["packages/contracts"],
    taskType: "bugfix",
    acceptanceCriteria: ["Priority aliases normalize."],
    expectedChangedPaths: ["packages/contracts/src/index.ts"],
    requiredChecks: ["npm test"],
    requiredArtifacts: ["pull_request"],
    scoring: {
      correctness: 1
    }
  });

  assert.equal(task.priority, "high");
});

test("validateBenchmarkTask rejects unknown priority metadata", () => {
  assert.throws(() => validateBenchmarkTask({
    id: "bm-priority",
    title: "Priority labels",
    issueSlug: "priority-labels",
    scenarioId: "golden-open",
    priority: "urgent",
    packages: ["packages/contracts"],
    taskType: "bugfix",
    acceptanceCriteria: ["Priority aliases normalize."],
    expectedChangedPaths: ["packages/contracts/src/index.ts"],
    requiredChecks: ["npm test"],
    requiredArtifacts: ["pull_request"],
    scoring: {
      correctness: 1
    }
  }));
});

test("validateScenarioDefinition rejects templated seeded branches", () => {
  assert.throws(() => validateScenarioDefinition({
    id: "broken",
    kind: "seeded",
    issueSlug: "broken",
    branch: "scratch/<feature>",
    baseBranch: "main",
    shipTargetBranch: "integration/live",
    expectedCiStatus: "failed",
    expectedReviewOutcome: "pending",
    allowSubmit: true,
    allowShip: false,
    allowRollback: false,
    live: {
      owner: "oxnw",
      repo: "agentrail-e2e-sandbox",
      issueNumber: 1,
      pullNumber: 1,
      headBranch: "scenario/broken"
    },
    notes: "broken"
  }));
});

test("validateScenarioDefinition requires concrete seeded live metadata", () => {
  assert.throws(() => validateScenarioDefinition({
    id: "seeded-missing-live",
    kind: "seeded",
    issueSlug: "seeded-missing-live",
    branch: "scenario/seeded-missing-live",
    baseBranch: "main",
    shipTargetBranch: "integration/live",
    expectedCiStatus: "passed",
    expectedReviewOutcome: "approved",
    allowSubmit: true,
    allowShip: false,
    allowRollback: false,
    live: {
      owner: "oxnw",
      repo: "agentrail-e2e-sandbox"
    },
    notes: "missing"
  }));
});

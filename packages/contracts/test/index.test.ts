import test from "node:test";
import assert from "node:assert/strict";
import type { BenchmarkTask } from "../src/index.js";
import {
  normalizePriorityLabel,
  validateBenchmarkCatalog,
  validateBenchmarkTask,
  validateScenarioDefinition
} from "../src/index.js";

test("normalizePriorityLabel maps aliases", () => {
  assert.equal(normalizePriorityLabel("p0"), "critical");
  assert.equal(normalizePriorityLabel("P1"), "high");
  assert.equal(normalizePriorityLabel("default"), "medium");
  assert.equal(normalizePriorityLabel("p2"), "low");
});

test("normalizePriorityLabel handles edge-case formatting", () => {
  assert.equal(normalizePriorityLabel("  BLOCKER "), "critical");
  assert.equal(normalizePriorityLabel("sev_1"), "high");
  assert.equal(normalizePriorityLabel(" med "), "medium");
  assert.equal(normalizePriorityLabel("sev 2"), "low");
});

test("normalizePriorityLabel rejects unknown values", () => {
  assert.throws(() => normalizePriorityLabel("urgent"));
});

test("validateBenchmarkTask normalizes priority metadata", () => {
  const task = createBenchmarkTask({ priority: "P-0" });

  assert.equal(validateBenchmarkTask(task).priority, "critical");
  assert.equal(task.priority, "critical");
});

test("validateBenchmarkTask rejects unknown priority metadata", () => {
  const task = createBenchmarkTask({ priority: "urgent" });

  assert.throws(() => validateBenchmarkTask(task), /Unknown priority label: urgent/);
});

test("validateBenchmarkCatalog normalizes all task priorities", () => {
  const catalog = {
    version: 1,
    tasks: [
      createBenchmarkTask({ id: "critical-task", priority: "sev0" }),
      createBenchmarkTask({ id: "medium-task", priority: "normal" })
    ]
  };

  assert.deepEqual(validateBenchmarkCatalog(catalog).tasks.map((task) => task.priority), ["critical", "medium"]);
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

function createBenchmarkTask(overrides: Record<string, unknown> = {}): BenchmarkTask {
  return {
    id: "bm_test",
    title: "Test benchmark",
    issueSlug: "benchmark-test",
    scenarioId: "golden-open",
    priority: "high",
    packages: ["packages/contracts"],
    taskType: "feature",
    acceptanceCriteria: ["x"],
    expectedChangedPaths: ["packages/contracts/src/index.ts"],
    requiredChecks: ["npm test"],
    requiredArtifacts: [],
    scoring: { correctness: 1 },
    ...overrides
  } as BenchmarkTask;
}

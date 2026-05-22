import test from "node:test";
import assert from "node:assert/strict";
import { normalizePriorityLabel, validateScenarioDefinition } from "../src/index.js";

test("normalizePriorityLabel maps aliases", () => {
  assert.equal(normalizePriorityLabel("p0"), "critical");
  assert.equal(normalizePriorityLabel("urgent"), "critical");
  assert.equal(normalizePriorityLabel("blocker"), "critical");
  assert.equal(normalizePriorityLabel("P1"), "high");
  assert.equal(normalizePriorityLabel("major"), "high");
  assert.equal(normalizePriorityLabel("sev1"), "high");
  assert.equal(normalizePriorityLabel("default"), "medium");
  assert.equal(normalizePriorityLabel("linear-e2e-57"), "medium");
  assert.equal(normalizePriorityLabel("linear-e2e-57-sync"), "medium");
  assert.equal(normalizePriorityLabel("review-e2e-bot"), "medium");
  assert.equal(normalizePriorityLabel("review-e2e-followup"), "medium");
  assert.equal(normalizePriorityLabel("circleci-e2e-58-20260519T170403Z"), "medium");
  assert.equal(normalizePriorityLabel("circleci-e2e-58-20260519T171721Z"), "medium");
  assert.equal(normalizePriorityLabel("p2"), "low");
});

test("normalizePriorityLabel rejects unknown values", () => {
  assert.throws(() => normalizePriorityLabel("escalated"));
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

test("validateScenarioDefinition rejects seeded live head branch mismatches", () => {
  assert.throws(() => validateScenarioDefinition({
    id: "seeded-mismatched-head",
    kind: "seeded",
    issueSlug: "seeded-mismatched-head",
    branch: "scenario/seeded-mismatched-head",
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
      headBranch: "scenario/other-head"
    },
    notes: "mismatch"
  }), /seeded-mismatched-head/);
});

test("validateScenarioDefinition allows scratch branch templates", () => {
  assert.doesNotThrow(() => validateScenarioDefinition({
    id: "scratch-template",
    kind: "scratch",
    issueSlug: "scratch-template",
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
      repo: "agentrail-e2e-sandbox",
      headBranch: "scratch/<feature>-<date>"
    },
    notes: "scratch template"
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

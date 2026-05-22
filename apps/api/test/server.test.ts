import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/server.js";

function request(path: string) {
  let status = 0;
  let body = "";

  handleRequest(
    { method: "GET", url: path },
    {
      writeHead(statusCode) {
        status = statusCode;
        return this;
      },
      end(chunk) {
        body = String(chunk);
        return this;
      }
    }
  );

  return { status, body: JSON.parse(body) };
}

test("GET /health returns service status", () => {
  const response = request("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = request("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(response.body.data.title, "Expose benchmark task details through the API");
  assert.equal(response.body.data.priority, "medium");
  assert.deepEqual(response.body.data.packages, ["apps/api", "packages/contracts"]);
  assert.equal(response.body.data.scenarioId, "golden-open");
  assert.equal(response.body.data.scenarioKind, "seeded");
  assert.equal(response.body.data.expectedCiStatus, "passed");
  assert.equal(response.body.data.expectedReviewOutcome, "approved");
  assert.equal(response.body.data.rollbackEligible, false);
});

test("GET /benchmarks/:id keeps catalog task fields at the top level", () => {
  const response = request("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.taskType, "feature");
  assert.deepEqual(response.body.data.acceptanceCriteria, [
    "API returns benchmark task metadata by id.",
    "Unknown task ids return 404 JSON responses.",
    "Tests cover success and not-found responses."
  ]);
  assert.deepEqual(response.body.data.expectedChangedPaths, [
    "apps/api/src/server.ts",
    "apps/api/test/server.test.ts",
    "packages/contracts/src/index.ts"
  ]);
  assert.deepEqual(response.body.data.requiredChecks, ["CI / Unit Tests"]);
  assert.equal(response.body.data.scoring.correctness, 0.5);
});

test("GET /benchmarks/:id returns rollback eligibility from the scenario manifest", () => {
  const response = request("/benchmarks/bm_crosspkg_rollback_audit");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.scenarioId, "scratch-live-cycle");
  assert.equal(response.body.data.scenarioKind, "scratch");
  assert.equal(response.body.data.expectedCiStatus, "variable");
  assert.equal(response.body.data.expectedReviewOutcome, "variable");
  assert.equal(response.body.data.rollbackEligible, true);
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = request("/benchmarks/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = request("/tasks");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = response.body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

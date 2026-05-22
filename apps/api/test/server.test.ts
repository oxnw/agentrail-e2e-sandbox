import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/server.js";

function get(path: string): { status: number; body: any } {
  let status = 0;
  let responseBody = "";
  const response = {
    writeHead(nextStatus: number) {
      status = nextStatus;
      return response;
    },
    end(chunk: string) {
      responseBody = chunk;
      return response;
    }
  };

  handleRequest({ method: "GET", url: path }, response);

  return {
    status,
    body: JSON.parse(responseBody)
  };
}

test("GET /health returns service status", () => {
  const response = get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = get("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(response.body.data.title, "Expose benchmark task details through the API");
  assert.equal(response.body.data.scenarioId, "golden-open");
  assert.equal(response.body.data.scenarioKind, "seeded");
  assert.equal(response.body.data.expectedCiStatus, "passed");
  assert.equal(response.body.data.expectedReviewOutcome, "approved");
  assert.equal(response.body.data.rollbackEligible, false);
  assert.ok(Array.isArray(response.body.data.acceptanceCriteria));
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = get("/benchmarks/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "not_found");
});

test("GET /benchmarks/:id reflects scratch scenario rollback eligibility", () => {
  const response = get("/benchmarks/bm_crosspkg_rollback_audit");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "bm_crosspkg_rollback_audit");
  assert.equal(response.body.data.scenarioId, "scratch-live-cycle");
  assert.equal(response.body.data.scenarioKind, "scratch");
  assert.equal(response.body.data.expectedCiStatus, "variable");
  assert.equal(response.body.data.expectedReviewOutcome, "variable");
  assert.equal(response.body.data.rollbackEligible, true);
  assert.equal(response.body.data.priority, "high");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = get("/tasks");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = response.body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

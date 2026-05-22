import test from "node:test";
import assert from "node:assert/strict";
import { handleApiRequest } from "../src/server.js";

interface ApiResponseBody {
  status?: string;
  data?: Array<{ id: string; scenarioId: string; status: string; availableActions: string[]; reviewRequired: boolean }> | {
    id: string;
    scenarioId: string;
  };
  error?: { code: string };
}

function request(path: string) {
  const response = handleApiRequest("GET", path);

  return { status: response.status, body: response.body as ApiResponseBody };
}

test("GET /health returns service status", () => {
  const { status, body } = request("/health");

  assert.equal(status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const { status, body } = request("/benchmarks/bm_api_benchmark_endpoint");
  const task = body.data as { id: string; scenarioId: string };

  assert.equal(status, 200);
  assert.equal(task.id, "bm_api_benchmark_endpoint");
  assert.equal(task.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const { status, body } = request("/benchmarks/missing");

  assert.equal(status, 404);
  assert.equal(body.error?.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const { status, body } = request("/tasks");
  const tasks = body.data as Array<{
    id: string;
    scenarioId: string;
    status: string;
    availableActions: string[];
    reviewRequired: boolean;
  }>;

  assert.equal(status, 200);
  assert.ok(Array.isArray(tasks));
  assert.ok(tasks.some((task) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = tasks.find((task) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(goldenTask.reviewRequired, false);
  const failingTask = tasks.find((task) => task.scenarioId === "failing-open");
  assert.ok(failingTask);
  assert.equal(failingTask.reviewRequired, true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { routeRequest } from "../src/server.js";

interface ResponseBody {
  status?: string;
  data?: any;
  error?: {
    code: string;
  };
}

test("GET /health returns service status", () => {
  const response = routeRequest("GET", "/health");
  const body = response.body as ResponseBody;
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = routeRequest("GET", "/benchmarks/bm_api_benchmark_endpoint");
  const body = response.body as ResponseBody;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = routeRequest("GET", "/benchmarks/missing");
  const body = response.body as ResponseBody;

  assert.equal(response.status, 404);
  assert.ok(body.error);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = routeRequest("GET", "/tasks");
  const body = response.body as ResponseBody;

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(typeof goldenTask.taskType, "string");
});

test("GET /tasks/summary returns counts derived from task snapshots", () => {
  const tasksResponse = routeRequest("GET", "/tasks");
  const summaryResponse = routeRequest("GET", "/tasks/summary");
  const tasksBody = tasksResponse.body as ResponseBody;
  const summaryBody = summaryResponse.body as ResponseBody;

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryBody.data.total, tasksBody.data.length);
  assert.deepEqual(summaryBody.data.byStatus, countBy(tasksBody.data, "status", ["todo", "in_review", "ready_to_ship"]));
  assert.deepEqual(summaryBody.data.byPriority, countBy(tasksBody.data, "priority", ["critical", "high", "medium", "low"]));
  assert.deepEqual(summaryBody.data.byTaskType, countBy(tasksBody.data, "taskType"));
});

function countBy(tasks: Array<Record<string, string>>, field: string, keys: string[] = []) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const task of tasks) {
    const value = task[field];
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

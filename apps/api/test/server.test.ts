import test from "node:test";
import assert from "node:assert/strict";
import type { BenchmarkTask, TaskSnapshot, TaskSummary } from "../../../packages/contracts/src/index.js";
import { routeRequest } from "../src/server.js";

test("GET /health returns service status", () => {
  const response = routeRequest("GET", "/health");
  const body = response.body as { status: string };

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = routeRequest("GET", "/benchmarks/bm_api_benchmark_endpoint");
  const body = response.body as { data: BenchmarkTask };

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = routeRequest("GET", "/benchmarks/missing");
  const body = response.body as { error: { code: string } };

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = routeRequest("GET", "/tasks");
  const body = response.body as { data: TaskSnapshot[] };

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(goldenTask.taskType, "bugfix");
});

test("GET /tasks/summary returns counts derived from task snapshots", () => {
  const tasksResponse = routeRequest("GET", "/tasks");
  const summaryResponse = routeRequest("GET", "/tasks/summary");
  const tasksBody = tasksResponse.body as { data: TaskSnapshot[] };
  const summaryBody = summaryResponse.body as { data: TaskSummary };

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryBody.data.total, tasksBody.data.length);
  assert.deepEqual(summaryBody.data.byStatus, countBy(tasksBody.data, "status", ["todo", "in_review", "ready_to_ship"]));
  assert.deepEqual(summaryBody.data.byPriority, countBy(tasksBody.data, "priority", ["critical", "high", "medium", "low"]));
  assert.deepEqual(summaryBody.data.byTaskType, countBy(tasksBody.data, "taskType"));
});

function countBy<T, K extends keyof T>(items: T[], key: K, expectedKeys: string[] = []) {
  const counts: Record<string, number> = Object.fromEntries(expectedKeys.map((expectedKey) => [expectedKey, 0]));
  for (const item of items) {
    const value = String(item[key]);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

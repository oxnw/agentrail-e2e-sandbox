import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { handleRequest } from "../src/server.js";

test("GET /health returns service status", () => {
  const response = request("GET", "/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = request("GET", "/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(response.body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = request("GET", "/benchmarks/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = request("GET", "/tasks");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = response.body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(goldenTask.taskType, "bugfix");
});

test("GET /tasks/summary returns counts derived from task snapshots", () => {
  const tasksResponse = request("GET", "/tasks");
  const summaryResponse = request("GET", "/tasks/summary");

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body.data.total, tasksResponse.body.data.length);
  assert.deepEqual(summaryResponse.body.data.byStatus, countBy(tasksResponse.body.data, "status", {
    todo: 0,
    in_review: 0,
    ready_to_ship: 0
  }));
  assert.deepEqual(summaryResponse.body.data.byPriority, countBy(tasksResponse.body.data, "priority", {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }));
  assert.deepEqual(summaryResponse.body.data.byTaskType, countBy(tasksResponse.body.data, "taskType"));
});

function request(method: string, url: string): { status: number; body: any } {
  let status = 0;
  let payload = "";

  const req = { method, url } as http.IncomingMessage;
  const res = {
    writeHead(statusCode: number) {
      status = statusCode;
      return this;
    },
    end(chunk: string) {
      payload = chunk;
      return this;
    }
  } as unknown as http.ServerResponse;

  handleRequest(req, res);
  return { status, body: JSON.parse(payload) };
}

function countBy<T extends Record<string, string>>(
  items: T[],
  field: keyof T,
  initialCounts: Record<string, number> = {}
): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item[field]] = (counts[item[field]] ?? 0) + 1;
    return counts;
  }, { ...initialCounts });
}

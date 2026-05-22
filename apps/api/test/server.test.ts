import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { handleRequest } from "../src/server.js";

test("GET /health returns service status", () => {
  const response = request("GET", "/health");
  const body = response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = request("GET", "/benchmarks/bm_priority_alias_trim");
  const body = response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_priority_alias_trim");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = request("GET", "/benchmarks/missing");
  const body = response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = request("GET", "/tasks");
  const body = response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_node_setup_check"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(typeof goldenTask.taskType, "string");
});

test("GET /tasks/summary returns counts derived from task snapshots", () => {
  const tasksResponse = request("GET", "/tasks");
  const tasksBody = tasksResponse.json();
  const summaryResponse = request("GET", "/tasks/summary");
  const summaryBody = summaryResponse.json();
  const snapshots = tasksBody.data as Array<{ status: string; priority: string; taskType: string }>;

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryBody.data.total, snapshots.length);
  assert.deepEqual(
    summaryBody.data.byStatus,
    countBy(snapshots, "status", { todo: 0, in_review: 0, ready_to_ship: 0 })
  );
  assert.deepEqual(
    summaryBody.data.byPriority,
    countBy(snapshots, "priority", { critical: 0, high: 0, medium: 0, low: 0 })
  );
  assert.deepEqual(summaryBody.data.byTaskType, countBy(snapshots, "taskType"));
});

function request(method: string, url: string) {
  let status = 0;
  let body = "";
  const req = { method, url } as http.IncomingMessage;
  const res = {
    writeHead(statusCode: number) {
      status = statusCode;
      return this;
    },
    end(payload: string) {
      body = payload;
      return this;
    }
  } as unknown as http.ServerResponse;

  handleRequest(req, res);

  return {
    status,
    json: () => JSON.parse(body) as Record<string, any>
  };
}

function countBy<T extends Record<string, string>>(
  items: T[],
  key: keyof T,
  seed: Record<string, number> = {}
): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = item[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, { ...seed });
}

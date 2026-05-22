import test from "node:test";
import assert from "node:assert/strict";
import type * as http from "node:http";
import { handleRequest } from "../src/server.js";

function request(path: string) {
  let status = 0;
  let rawBody = "";
  const headers: http.OutgoingHttpHeaders = {};
  const res = {
    writeHead(nextStatus: number, nextHeaders: http.OutgoingHttpHeaders) {
      status = nextStatus;
      Object.assign(headers, nextHeaders);
      return res as unknown as http.ServerResponse;
    },
    end(chunk?: unknown) {
      rawBody = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk ?? "");
      return res as unknown as http.ServerResponse;
    }
  } as unknown as http.ServerResponse;

  handleRequest({ method: "GET", url: path } as http.IncomingMessage, res);

  return {
    status,
    headers,
    body: JSON.parse(rawBody)
  };
}

test("GET /health returns service status", () => {
  const { status, body } = request("/health");

  assert.equal(status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const { status, body } = request("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const { status, body } = request("/benchmarks/missing");

  assert.equal(status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const { status, body } = request("/tasks");

  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(typeof goldenTask.taskType, "string");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks/summary returns aggregate counts derived from task snapshots", () => {
  const tasksBody = request("/tasks").body;
  const summary = request("/tasks/summary");

  const expected = {
    total: tasksBody.data.length,
    byStatus: { todo: 0, in_review: 0, ready_to_ship: 0 },
    byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
    byTaskType: {} as Record<string, number>
  };

  for (const task of tasksBody.data as Array<{ status: keyof typeof expected.byStatus; priority: keyof typeof expected.byPriority; taskType: string }>) {
    expected.byStatus[task.status] += 1;
    expected.byPriority[task.priority] += 1;
    expected.byTaskType[task.taskType] = (expected.byTaskType[task.taskType] ?? 0) + 1;
  }

  assert.equal(summary.status, 200);
  assert.deepEqual(summary.body.data, expected);
});

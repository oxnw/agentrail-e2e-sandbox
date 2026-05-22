import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { createServer } from "../src/server.js";

async function requestJson(path: string, method = "GET") {
  const server = createServer();

  return new Promise<{ status: number; body: any }>((resolve) => {
    const req = { method, url: path } as http.IncomingMessage;
    const res = {
      statusCode: 200,
      writeHead(status: number) {
        this.statusCode = status;
        return this;
      },
      end(payload: string) {
        server.close();
        resolve({ status: this.statusCode, body: JSON.parse(payload) });
      }
    } as http.ServerResponse;

    server.emit("request", req, res);
  });
}

test("GET /health returns service status", async () => {
  const response = await requestJson("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await requestJson("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(response.body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const response = await requestJson("/benchmarks/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const response = await requestJson("/tasks");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = response.body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks filters task snapshots by status", async () => {
  const response = await requestJson("/tasks?status=todo");

  assert.equal(response.status, 200);
  assert.ok(response.body.data.length > 0);
  assert.ok(response.body.data.every((task: { status: string }) => task.status === "todo"));
});

test("GET /tasks filters task snapshots by priority", async () => {
  const response = await requestJson("/tasks?priority=medium");

  assert.equal(response.status, 200);
  assert.ok(response.body.data.length > 0);
  assert.ok(response.body.data.every((task: { priority: string }) => task.priority === "medium"));
});

test("GET /tasks returns 400 for unsupported filter values", async () => {
  const statusResponse = await requestJson("/tasks?status=done");
  const priorityResponse = await requestJson("/tasks?priority=urgent");

  assert.equal(statusResponse.status, 400);
  assert.equal(statusResponse.body.error.code, "invalid_filter");
  assert.equal(statusResponse.body.error.field, "status");
  assert.equal(priorityResponse.status, 400);
  assert.equal(priorityResponse.body.error.code, "invalid_filter");
  assert.equal(priorityResponse.body.error.field, "priority");
});

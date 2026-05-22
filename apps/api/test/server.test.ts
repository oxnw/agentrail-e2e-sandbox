import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { handleRequest } from "../src/server.js";

async function get(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req = { method: "GET", url: path } as http.IncomingMessage;
    let status = 0;

    const res = {
      writeHead(statusCode: number) {
        status = statusCode;
        return this;
      },
      end(chunk?: unknown) {
        resolve({ status, body: JSON.parse(String(chunk)) });
        return this;
      }
    } as unknown as http.ServerResponse;

    handleRequest(req, res);
  });
}

test("GET /health returns service status", async () => {
  const response = await get("/health");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await get("/benchmarks/bm_api_benchmark_endpoint");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const response = await get("/benchmarks/missing");
  const body = response.body;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const response = await get("/tasks");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks filters task snapshots by status", async () => {
  const response = await get("/tasks?status=todo");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((task: { status: string }) => task.status === "todo"));
});

test("GET /tasks filters task snapshots by priority", async () => {
  const response = await get("/tasks?priority=medium");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((task: { priority: string }) => task.priority === "medium"));
});

test("GET /tasks returns 400 for unsupported filters", async () => {
  const invalidStatusResponse = await get("/tasks?status=done");
  const invalidStatusBody = invalidStatusResponse.body;
  const invalidPriorityResponse = await get("/tasks?priority=urgent");
  const invalidPriorityBody = invalidPriorityResponse.body;

  assert.equal(invalidStatusResponse.status, 400);
  assert.equal(invalidStatusBody.error.code, "invalid_filter");
  assert.equal(invalidPriorityResponse.status, 400);
  assert.equal(invalidPriorityBody.error.code, "invalid_filter");
});

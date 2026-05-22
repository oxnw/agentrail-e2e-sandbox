import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { createServer } from "../src/server.js";

interface TestResponse {
  status: number;
  body: any;
}

function request(path: string): Promise<TestResponse> {
  const server = createServer();
  return new Promise((resolve) => {
    let status = 0;
    let responseBody = "";
    const req = {
      method: "GET",
      url: path
    } as http.IncomingMessage;
    const res = {
      writeHead(statusCode: number) {
        status = statusCode;
        return res;
      },
      end(body?: string) {
        responseBody = body ?? "";
        server.close();
        resolve({ status, body: JSON.parse(responseBody) });
      }
    } as http.ServerResponse;

    server.emit("request", req, res);
  });
}

test("GET /health returns service status", async () => {
  const response = await request("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await request("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(response.body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const response = await request("/benchmarks/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const response = await request("/tasks");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = response.body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks filters task snapshots by status", async () => {
  const response = await request("/tasks?status=todo");

  assert.equal(response.status, 200);
  assert.ok(response.body.data.length > 0);
  assert.ok(response.body.data.every((task: { status: string }) => task.status === "todo"));
});

test("GET /tasks filters task snapshots by priority", async () => {
  const response = await request("/tasks?priority=medium");

  assert.equal(response.status, 200);
  assert.ok(response.body.data.length > 0);
  assert.ok(response.body.data.every((task: { priority: string }) => task.priority === "medium"));
});

test("GET /tasks returns 400 for unsupported filter values", async () => {
  const invalidStatusResponse = await request("/tasks?status=done");
  const invalidPriorityResponse = await request("/tasks?priority=urgent");

  assert.equal(invalidStatusResponse.status, 400);
  assert.equal(invalidStatusResponse.body.error.code, "invalid_filter");
  assert.equal(invalidPriorityResponse.status, 400);
  assert.equal(invalidPriorityResponse.body.error.code, "invalid_filter");
});

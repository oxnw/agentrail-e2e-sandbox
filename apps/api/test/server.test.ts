import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { handleRequest } from "../src/server.js";

interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

async function request(path: string): Promise<TestResponse> {
  return new Promise((resolve) => {
    let status = 0;
    let headers: Record<string, string> = {};
    const req = { method: "GET", url: path } as http.IncomingMessage;
    const res = {
      writeHead(responseStatus: number, responseHeaders: Record<string, string>) {
        status = responseStatus;
        headers = responseHeaders;
        return this;
      },
      end(responseBody: string) {
        resolve({ status, headers, body: JSON.parse(responseBody) });
      }
    } as http.ServerResponse;

    handleRequest(req, res);
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

test("GET /tasks?status=todo returns only todo task snapshots", async () => {
  const response = await request("/tasks?status=todo");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.length > 0);
  assert.ok(response.body.data.every((task: { status: string }) => task.status === "todo"));
});

test("GET /tasks?priority=medium returns only medium-priority task snapshots", async () => {
  const response = await request("/tasks?priority=medium");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.length > 0);
  assert.ok(response.body.data.every((task: { priority: string }) => task.priority === "medium"));
});

test("GET /tasks supports status and priority filters together", async () => {
  const response = await request("/tasks?status=todo&priority=medium");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(
    response.body.data.every(
      (task: { status: string; priority: string }) => task.status === "todo" && task.priority === "medium"
    )
  );
});

test("GET /tasks returns 400 JSON error for unsupported filter values", async () => {
  const response = await request("/tasks?status=done");

  assert.equal(response.status, 400);
  assert.equal(response.headers["content-type"], "application/json");
  assert.equal(response.body.error.code, "invalid_filter");
  assert.match(response.body.error.message, /Unsupported status filter value: done/);

  const priorityResponse = await request("/tasks?priority=unknown");

  assert.equal(priorityResponse.status, 400);
  assert.equal(priorityResponse.headers["content-type"], "application/json");
  assert.equal(priorityResponse.body.error.code, "invalid_filter");
  assert.match(priorityResponse.body.error.message, /Unsupported priority filter value: unknown/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createRequestHandler } from "../src/server.js";

function request(path: string) {
  const handler = createRequestHandler();
  let status = 0;
  let body: any;

  handler(
    { method: "GET", url: path },
    {
      writeHead(statusCode) {
        status = statusCode;
        return this;
      },
      end(chunk) {
        body = JSON.parse(String(chunk));
        return this;
      }
    }
  );

  return { status, body };
}

test("GET /health returns service status", () => {
  const response = request("/health");
  const { body } = response;

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = request("/benchmarks/bm_api_benchmark_endpoint");
  const { body } = response;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = request("/benchmarks/missing");
  const { body } = response;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = request("/tasks");
  const { body } = response;

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks filters snapshots by status", () => {
  const response = request("/tasks?status=todo");
  const { body } = response;

  assert.equal(response.status, 200);
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((task: { status: string }) => task.status === "todo"));
});

test("GET /tasks filters snapshots by priority", () => {
  const response = request("/tasks?priority=medium");
  const { body } = response;

  assert.equal(response.status, 200);
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((task: { priority: string }) => task.priority === "medium"));
});

test("GET /tasks returns 400 for unsupported filter values", () => {
  const statusResponse = request("/tasks?status=closed");
  const priorityResponse = request("/tasks?priority=urgent");

  assert.equal(statusResponse.status, 400);
  assert.equal(statusResponse.body.error.code, "invalid_filter");
  assert.equal(priorityResponse.status, 400);
  assert.equal(priorityResponse.body.error.code, "invalid_filter");
});

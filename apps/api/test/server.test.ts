import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

async function request(path: string) {
  const server = createServer();
  let status = 0;
  let rawBody = "";

  const response = {
    writeHead(statusCode: number) {
      status = statusCode;
    },
    end(body: string) {
      rawBody = body;
    }
  };

  server.emit("request", { method: "GET", url: path }, response);
  server.close();

  return {
    status,
    body: JSON.parse(rawBody)
  };
}

test("GET /health returns service status", async () => {
  const { status, body } = await request("/health");

  assert.equal(status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const { status, body } = await request("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const { status, body } = await request("/benchmarks/missing");

  assert.equal(status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const { status, body } = await request("/tasks");

  assert.equal(status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks/:id returns a task snapshot with the same shape as the task list", async () => {
  const list = await request("/tasks");
  const detail = await request("/tasks/bm_api_task_detail");

  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.id, "bm_api_task_detail");
  assert.deepEqual(
    Object.keys(detail.body.data).sort(),
    Object.keys(list.body.data.find((task: { id: string }) => task.id === "bm_api_task_detail")).sort()
  );
  assert.deepEqual(
    detail.body.data,
    list.body.data.find((task: { id: string }) => task.id === "bm_api_task_detail")
  );
});

test("GET /tasks/:id returns 404 JSON for unknown task ids", async () => {
  const { status, body } = await request("/tasks/missing");

  assert.equal(status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Task was not found.");
});

test("GET /tasks/summary is not shadowed by task detail lookups", async () => {
  const { status, body } = await request("/tasks/summary");

  assert.equal(status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Route was not found.");
});

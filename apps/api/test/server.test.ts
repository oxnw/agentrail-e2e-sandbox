import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

async function request(path: string) {
  const server = createServer();
  return new Promise<{ status: number; body: any }>((resolve) => {
    let status = 0;
    const req = { method: "GET", url: path };
    const res = {
      writeHead(responseStatus: number) {
        status = responseStatus;
      },
      end(body: string) {
        resolve({ status, body: JSON.parse(body) });
      }
    };

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

test("GET /tasks/:id returns a task snapshot matching the task list shape", async () => {
  const listResponse = await request("/tasks");
  const detailResponse = await request("/tasks/bm_api_task_detail");

  assert.equal(detailResponse.status, 200);
  assert.deepEqual(
    detailResponse.body.data,
    listResponse.body.data.find((task: { id: string }) => task.id === "bm_api_task_detail")
  );
});

test("GET /tasks/:id returns 404 JSON for unknown task ids", async () => {
  const response = await request("/tasks/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "not_found");
  assert.equal(response.body.error.message, "Task was not found.");
});

test("GET /tasks/summary is not shadowed by the task detail route", async () => {
  const response = await request("/tasks/summary");

  assert.equal(response.status, 200);
  assert.equal(typeof response.body.data.total, "number");
  assert.equal(typeof response.body.data.byStatus, "object");
});

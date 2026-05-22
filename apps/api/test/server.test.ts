import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleRequest } from "../src/server.js";

async function request(path: string) {
  let status = 0;
  let bodyText = "";

  await new Promise<void>((resolve) => {
    const req = { method: "GET", url: path } as IncomingMessage;
    const res = {
      writeHead(nextStatus: number) {
        status = nextStatus;
        return res;
      },
      end(body?: string) {
        bodyText = body ?? "";
        resolve();
        return res;
      }
    } as ServerResponse;

    handleRequest(req, res);
  });

  return { status, body: JSON.parse(bodyText) };
}

test("GET /health returns service status", async () => {
  const response = await request("/health");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await request("/benchmarks/bm_api_benchmark_endpoint");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const response = await request("/benchmarks/missing");
  const body = response.body;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const response = await request("/tasks");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks/:id returns a task snapshot matching the list shape", async () => {
  const listResponse = await request("/tasks");
  const listBody = listResponse.body;
  const detailResponse = await request("/tasks/bm_api_task_detail");
  const detailBody = detailResponse.body;

  assert.equal(detailResponse.status, 200);
  assert.deepEqual(
    detailBody.data,
    listBody.data.find((task: { id: string }) => task.id === "bm_api_task_detail")
  );
});

test("GET /tasks/:id returns 404 for unknown task snapshots", async () => {
  const response = await request("/tasks/missing");
  const body = response.body;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Task snapshot was not found.");
});

test("GET /tasks/summary is handled before task detail lookups", async () => {
  const response = await request("/tasks/summary");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(typeof body.data.total, "number");
  assert.equal(typeof body.data.byStatus, "object");
});

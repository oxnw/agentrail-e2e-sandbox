import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

interface TestResponse {
  status: number;
  body: any;
}

interface MockResponse {
  writeHead(status: number, headers: Record<string, string>): MockResponse;
  end(chunk: string): void;
}

async function request(path: string): Promise<TestResponse> {
  const server = createServer();
  const req = { method: "GET", url: path };
  let status = 0;

  return new Promise((resolve) => {
    const res: MockResponse = {
      writeHead(nextStatus) {
        status = nextStatus;
        return res;
      },
      end(chunk) {
        resolve({ status, body: JSON.parse(chunk) });
      }
    };

    server.emit("request", req, res);
  });
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

test("GET /tasks/:id returns a single task snapshot matching the task list shape", async () => {
  const listResponse = await request("/tasks");
  const listBody = listResponse.body;
  const response = await request("/tasks/bm_api_task_detail");
  const body = response.body;
  const listSnapshot = listBody.data.find((task: { id: string }) => task.id === "bm_api_task_detail");

  assert.equal(response.status, 200);
  assert.ok(listSnapshot);
  assert.deepEqual(body.data, listSnapshot);
});

test("GET /tasks/:id returns 404 JSON for unknown task snapshots", async () => {
  const response = await request("/tasks/missing");
  const body = response.body;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Task snapshot was not found.");
});

test("GET /tasks/summary is not handled as a task detail lookup", async () => {
  const response = await request("/tasks/summary");
  const body = response.body;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Route was not found.");
});

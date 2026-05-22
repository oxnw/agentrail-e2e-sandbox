import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

function request(path: string) {
  const server = createServer();
  const handleRequest = server.listeners("request")[0] as (
    req: { method: string; url: string },
    res: {
      writeHead: (status: number, headers: Record<string, string>) => void;
      end: (body: string) => void;
    }
  ) => void;

  let status = 0;
  let responseBody = "";

  handleRequest(
    { method: "GET", url: path },
    {
      writeHead(nextStatus) {
        status = nextStatus;
      },
      end(body) {
        responseBody = body;
      }
    }
  );

  return { status, body: JSON.parse(responseBody) };
}

test("GET /health returns service status", () => {
  const response = request("/health");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = request("/benchmarks/bm_api_benchmark_endpoint");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = request("/benchmarks/missing");
  const body = response.body;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = request("/tasks");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(goldenTask.reviewRequired, false);

  const failingTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "failing-open");
  assert.ok(failingTask);
  assert.equal(failingTask.reviewRequired, true);

  const scratchTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "scratch-live-cycle");
  assert.ok(scratchTask);
  assert.equal(scratchTask.reviewRequired, false);
});

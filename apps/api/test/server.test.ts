import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { createServer } from "../src/server.js";

async function request(path: string, method = "GET") {
  const server = createServer();
  const handler = server.listeners("request")[0] as (req: http.IncomingMessage, res: http.ServerResponse) => void;

  return await new Promise<{ status: number; body: any }>((resolve) => {
    let status = 0;
    const req = { method, url: path } as http.IncomingMessage;
    const res = {
      writeHead(nextStatus: number) {
        status = nextStatus;
        return res;
      },
      end(payload: string) {
        server.close();
        resolve({ status, body: JSON.parse(payload) });
      }
    } as unknown as http.ServerResponse;

    handler(req, res);
  });
}

test("GET /health returns service status", async () => {
  const response = await request("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await request("/benchmarks/bm_api_benchmark_endpoint");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.title, "Expose benchmark task details through the API");
  assert.equal(body.data.priority, "medium");
  assert.equal(body.data.scenarioId, "golden-open");
  assert.equal(body.data.scenarioKind, "seeded");
  assert.equal(body.data.expectedCiStatus, "passed");
  assert.equal(body.data.expectedReviewOutcome, "approved");
  assert.equal(body.data.rollbackEligible, false);
});

test("GET /benchmarks/:id includes rollback eligibility from the scenario manifest", async () => {
  const response = await request("/benchmarks/bm_crosspkg_rollback_audit");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_crosspkg_rollback_audit");
  assert.equal(body.data.scenarioId, "scratch-live-cycle");
  assert.equal(body.data.scenarioKind, "scratch");
  assert.equal(body.data.expectedCiStatus, "variable");
  assert.equal(body.data.expectedReviewOutcome, "variable");
  assert.equal(body.data.rollbackEligible, true);
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

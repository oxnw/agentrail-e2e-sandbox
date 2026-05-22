import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequestHandler } from "../src/server.js";

async function request(path: string) {
  const handler = createRequestHandler();

  return new Promise<{ status: number; headers: Record<string, string>; body: unknown }>((resolve) => {
    let status = 0;
    let headers: Record<string, string> = {};

    const req = { method: "GET", url: path } as IncomingMessage;
    const res = {
      writeHead(nextStatus: number, nextHeaders: Record<string, string>) {
        status = nextStatus;
        headers = nextHeaders;
        return this;
      },
      end(payload: string) {
        resolve({ status, headers, body: JSON.parse(payload) });
      }
    } as unknown as ServerResponse;

    handler(req, res);
  });
}

test("GET /health returns service status", async () => {
  const response = await request("/health");
  const body = response.body as { status: string };

  assert.equal(response.status, 200);
  assert.equal(response.headers["content-type"], "application/json");
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await request("/benchmarks/bm_priority_alias_trim");
  const body = response.body as { data: { id: string; scenarioId: string } };

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_priority_alias_trim");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const response = await request("/benchmarks/missing");
  const body = response.body as { error: { code: string } };

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const response = await request("/tasks");
  const body = response.body as {
    data: Array<{ id: string; scenarioId: string; status: string; availableActions: string[] }>;
  };

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_node_setup_check"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks/:id returns the matching task snapshot", async () => {
  const listResponse = await request("/tasks");
  const listBody = listResponse.body as { data: Array<{ id: string }> };
  const response = await request("/tasks/bm_api_task_detail");
  const body = response.body as { data: { id: string } };

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.data,
    listBody.data.find((task: { id: string }) => task.id === "bm_api_task_detail")
  );
});

test("GET /tasks/:id returns 404 JSON for unknown tasks", async () => {
  const response = await request("/tasks/missing");
  const body = response.body as { error: { code: string; message: string } };

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Task was not found.");
});

test("GET /tasks/summary is not shadowed by task detail lookup", async () => {
  const response = await request("/tasks/summary");
  const body = response.body as { error: { code: string; message: string } };

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Route was not found.");
});

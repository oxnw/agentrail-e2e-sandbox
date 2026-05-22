import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { createServer } from "../src/server.js";

interface TestResponse {
  statusCode: number;
  headers: http.OutgoingHttpHeaders;
  body: unknown;
}

async function request(path: string): Promise<TestResponse> {
  const server = createServer();
  const handler = server.listeners("request")[0] as (req: http.IncomingMessage, res: http.ServerResponse) => void;

  return await new Promise<TestResponse>((resolve) => {
    let statusCode = 200;
    let responseHeaders: http.OutgoingHttpHeaders = {};
    const response = {
      writeHead(nextStatusCode: number, headers?: http.OutgoingHttpHeaders) {
        statusCode = nextStatusCode;
        responseHeaders = headers ?? {};
        return response;
      },
      end(body?: string) {
        resolve({
          statusCode,
          headers: responseHeaders,
          body: body ? JSON.parse(body) : null
        });
        return response;
      }
    };

    handler({ method: "GET", url: path } as http.IncomingMessage, response as unknown as http.ServerResponse);
  });
}

test("GET /health returns service status", async () => {
  const response = await request("/health");
  const body = response.body as { status: string };

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await request("/benchmarks/bm_priority_alias_trim");
  const body = response.body as { data: { id: string; scenarioId: string } };

  assert.equal(response.statusCode, 200);
  assert.equal(body.data.id, "bm_priority_alias_trim");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const response = await request("/benchmarks/missing");
  const body = response.body as { error: { code: string } };

  assert.equal(response.statusCode, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const response = await request("/tasks");
  const body = response.body as {
    data: Array<{ id: string; scenarioId: string; status: string; availableActions: string[] }>;
  };

  assert.equal(response.statusCode, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task) => task.id === "bm_node_setup_check"));
  const goldenTask = body.data.find((task) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks filters snapshots by status", async () => {
  const response = await request("/tasks?status=todo");
  const body = response.body as { data: Array<{ status: string }> };

  assert.equal(response.statusCode, 200);
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((task) => task.status === "todo"));
});

test("GET /tasks filters snapshots by priority", async () => {
  const response = await request("/tasks?priority=medium");
  const body = response.body as { data: Array<{ priority: string }> };

  assert.equal(response.statusCode, 200);
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((task) => task.priority === "medium"));
});

test("GET /tasks returns 400 for unsupported filter values", async () => {
  const statusResponse = await request("/tasks?status=done");
  const statusBody = statusResponse.body as { error: { code: string } };
  const priorityResponse = await request("/tasks?priority=urgent");
  const priorityBody = priorityResponse.body as { error: { code: string } };

  assert.equal(statusResponse.statusCode, 400);
  assert.equal(statusBody.error.code, "invalid_filter");
  assert.equal(priorityResponse.statusCode, 400);
  assert.equal(priorityBody.error.code, "invalid_filter");
});

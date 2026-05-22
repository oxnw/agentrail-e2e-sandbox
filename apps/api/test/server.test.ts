import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type http from "node:http";
import { createServer } from "../src/server.js";

async function request(server: http.Server, path: string) {
  const req = new EventEmitter() as http.IncomingMessage;
  req.method = "GET";
  req.url = path;

  let status = 0;
  let body = "";
  const res = new EventEmitter() as http.ServerResponse;
  res.writeHead = ((statusCode: number) => {
    status = statusCode;
    return res;
  }) as http.ServerResponse["writeHead"];

  const done = new Promise<void>((resolve) => {
    res.end = ((chunk?: unknown) => {
      body = typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk.toString("utf8") : "";
      resolve();
      return res;
    }) as http.ServerResponse["end"];
  });

  server.emit("request", req, res);
  await done;

  return {
    status,
    json: JSON.parse(body)
  };
}

test("GET /health returns service status", async () => {
  const server = createServer();

  const response = await request(server, "/health");
  const body = response.json;

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const server = createServer();

  const response = await request(server, "/benchmarks/bm_api_benchmark_endpoint");
  const body = response.json;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const server = createServer();

  const response = await request(server, "/benchmarks/missing");
  const body = response.json;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const server = createServer();

  const response = await request(server, "/tasks");
  const body = response.json;

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.reviewRequired, false);
  assert.equal(goldenTask.availableActions.includes("ship"), false);

  const failingTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "failing-open");
  assert.ok(failingTask);
  assert.equal(failingTask.reviewRequired, true);

  const scratchTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "scratch-live-cycle");
  assert.ok(scratchTask);
  assert.equal(scratchTask.reviewRequired, false);
});

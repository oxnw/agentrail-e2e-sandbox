import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createServer } from "../src/server.js";

test("GET /health returns service status", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/benchmarks/bm_priority_alias_trim`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_priority_alias_trim");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/benchmarks/missing`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/tasks`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_node_setup_check"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

test("GET /tasks/:id returns a scenario-aware task snapshot", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const listResponse = await fetch(`${baseUrl}/tasks`);
  const listBody = await listResponse.json();
  const response = await fetch(`${baseUrl}/tasks/bm_api_task_detail`);
  const body = await response.json();
  const listSnapshot = listBody.data.find((task: { id: string }) => task.id === "bm_api_task_detail");

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, listSnapshot);
  assert.equal(body.data.id, "bm_api_task_detail");
  assert.equal(body.data.scenarioId, "failing-open");
});

test("GET /tasks/:id returns 404 for unknown task ids", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/tasks/missing`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Task was not found.");
});

test("GET /tasks/summary is not shadowed by task detail lookup", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/tasks/summary`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
  assert.equal(body.error.message, "Route was not found.");
});

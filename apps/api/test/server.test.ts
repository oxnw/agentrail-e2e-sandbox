import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createServer } from "../src/server.js";

async function withServer(t: TestContext) {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

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

test("GET /tasks filters task snapshots by status", async (t) => {
  const baseUrl = await withServer(t);
  const response = await fetch(`${baseUrl}/tasks?status=todo`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((task: { status: string }) => task.status === "todo"));
});

test("GET /tasks filters task snapshots by priority", async (t) => {
  const baseUrl = await withServer(t);
  const response = await fetch(`${baseUrl}/tasks?priority=medium`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.length > 0);
  assert.ok(body.data.every((task: { priority: string }) => task.priority === "medium"));
});

test("GET /tasks returns 400 JSON errors for unsupported filters", async (t) => {
  const baseUrl = await withServer(t);

  for (const path of ["/tasks?status=blocked", "/tasks?priority=urgent"]) {
    const response = await fetch(`${baseUrl}${path}`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "invalid_filter");
    assert.match(body.error.message, /Unsupported/);
  }
});

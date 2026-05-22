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
  assert.equal(typeof goldenTask.taskType, "string");
});

test("GET /tasks/summary returns counts derived from task snapshots", async (t) => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const tasksResponse = await fetch(`${baseUrl}/tasks`);
  const tasksBody = await tasksResponse.json();
  const summaryResponse = await fetch(`${baseUrl}/tasks/summary`);
  const summaryBody = await summaryResponse.json();

  const expected = {
    total: tasksBody.data.length,
    byStatus: {
      todo: 0,
      in_review: 0,
      ready_to_ship: 0
    },
    byPriority: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    byTaskType: {} as Record<string, number>
  };

  for (const task of tasksBody.data as Array<{ status: keyof typeof expected.byStatus; priority: keyof typeof expected.byPriority; taskType: string }>) {
    expected.byStatus[task.status] += 1;
    expected.byPriority[task.priority] += 1;
    expected.byTaskType[task.taskType] = (expected.byTaskType[task.taskType] ?? 0) + 1;
  }

  assert.equal(tasksResponse.status, 200);
  assert.equal(summaryResponse.status, 200);
  assert.deepEqual(summaryBody.data, expected);
});

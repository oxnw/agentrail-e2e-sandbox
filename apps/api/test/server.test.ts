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
  const tasksResponse = await fetch(`http://127.0.0.1:${address.port}/tasks`);
  const tasksBody = await tasksResponse.json();
  const summaryResponse = await fetch(`http://127.0.0.1:${address.port}/tasks/summary`);
  const summaryBody = await summaryResponse.json();

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryBody.data.total, tasksBody.data.length);
  assert.deepEqual(summaryBody.data.byStatus, countBy(tasksBody.data, "status", ["todo", "in_review", "ready_to_ship"]));
  assert.deepEqual(summaryBody.data.byPriority, countBy(tasksBody.data, "priority", ["critical", "high", "medium", "low"]));
  assert.deepEqual(summaryBody.data.byTaskType, countBy(tasksBody.data, "taskType"));
});

function countBy<T extends Record<string, string>>(items: T[], key: keyof T, initialKeys: string[] = []) {
  const counts: Record<string, number> = Object.fromEntries(initialKeys.map((initialKey) => [initialKey, 0]));

  for (const item of items) {
    counts[item[key]] = (counts[item[key]] ?? 0) + 1;
  }

  return counts;
}

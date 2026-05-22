import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { handleRequest } from "../src/server.js";

test("GET /health returns service status", async () => {
  const response = await request("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await request("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(response.body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const response = await request("/benchmarks/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const response = await request("/tasks");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = response.body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(typeof goldenTask.taskType, "string");
});

test("GET /tasks/summary returns counts derived from task snapshots", async () => {
  const [tasksResponse, summaryResponse] = await Promise.all([request("/tasks"), request("/tasks/summary")]);

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body.data.total, tasksResponse.body.data.length);
  assert.deepEqual(summaryResponse.body.data.byStatus, countBy(tasksResponse.body.data, "status", ["todo", "in_review", "ready_to_ship"]));
  assert.deepEqual(summaryResponse.body.data.byPriority, countBy(tasksResponse.body.data, "priority", ["critical", "high", "medium", "low"]));
  assert.deepEqual(summaryResponse.body.data.byTaskType, countBy(tasksResponse.body.data, "taskType"));
});

async function request(pathname: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    let responseStatus = 0;
    const req = { method: "GET", url: pathname } as http.IncomingMessage;
    const res = {
      writeHead(status: number) {
        responseStatus = status;
      },
      end(body: string) {
        resolve({ status: responseStatus, body: JSON.parse(body) });
      }
    } as unknown as http.ServerResponse;

    handleRequest(req, res);
  });
}

function countBy<T extends Record<string, string>>(items: T[], key: keyof T, initialKeys: string[] = []) {
  const counts: Record<string, number> = Object.fromEntries(initialKeys.map((initialKey) => [initialKey, 0]));

  for (const item of items) {
    counts[item[key]] = (counts[item[key]] ?? 0) + 1;
  }

  return counts;
}

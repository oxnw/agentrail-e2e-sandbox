import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

test("GET /health returns service status", async () => {
  const response = await request("GET", "/health");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", async () => {
  const response = await request("GET", "/benchmarks/bm_api_benchmark_endpoint");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", async () => {
  const response = await request("GET", "/benchmarks/missing");
  const body = response.body;

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", async () => {
  const response = await request("GET", "/tasks");
  const body = response.body;

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(typeof goldenTask.taskType, "string");
});

test("GET /tasks/summary returns counts derived from task snapshots", async () => {
  const [tasksResponse, summaryResponse] = await Promise.all([request("GET", "/tasks"), request("GET", "/tasks/summary")]);
  const tasksBody = tasksResponse.body;
  const summaryBody = summaryResponse.body;

  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryBody.data.total, tasksBody.data.length);
  assert.deepEqual(summaryBody.data.byStatus, countBy(tasksBody.data, "status", ["todo", "in_review", "ready_to_ship"]));
  assert.deepEqual(summaryBody.data.byPriority, countBy(tasksBody.data, "priority", ["critical", "high", "medium", "low"]));
  assert.deepEqual(summaryBody.data.byTaskType, countBy(tasksBody.data, "taskType"));
});

function countBy(
  tasks: Array<Record<string, string>>,
  key: string,
  initialKeys: string[] = []
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(initialKeys.map((initialKey) => [initialKey, 0]));
  for (const task of tasks) {
    counts[task[key]] = (counts[task[key]] ?? 0) + 1;
  }
  return counts;
}

interface MockResponse {
  body: any;
  headers: Record<string, string>;
  status: number;
}

async function request(method: string, url: string): Promise<MockResponse> {
  const server = createServer();
  const req = { method, url };

  return new Promise((resolve) => {
    const res = {
      status: 200,
      headers: {} as Record<string, string>,
      writeHead(status: number, headers: Record<string, string>) {
        this.status = status;
        this.headers = headers;
        return this;
      },
      end(payload: string) {
        resolve({
          body: JSON.parse(payload) as unknown,
          headers: this.headers,
          status: this.status
        });
        return this;
      }
    };

    server.emit("request", req, res);
    server.close();
  });
}

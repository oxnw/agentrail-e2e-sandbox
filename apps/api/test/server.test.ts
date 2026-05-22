import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/server.js";

interface TestResponse {
  status: number;
  body: unknown;
}

function request(path: string, method = "GET"): TestResponse {
  let status = 0;
  let rawBody = "";

  handleRequest(
    { method, url: path },
    {
      writeHead(code) {
        status = code;
        return this;
      },
      end(chunk) {
        rawBody = String(chunk);
        return this;
      }
    }
  );

  return { status, body: JSON.parse(rawBody) };
}

test("GET /health returns service status", () => {
  const response = request("/health");

  assert.equal(response.status, 200);
  assert.equal((response.body as { status: string }).status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = request("/benchmarks/bm_api_benchmark_endpoint");
  const body = response.body as { data: Record<string, unknown> };

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(body.data.title, "Expose benchmark task details through the API");
  assert.equal(body.data.taskType, "feature");
  assert.ok(Array.isArray(body.data.acceptanceCriteria));
  assert.equal(body.data.scenarioId, "golden-open");
  assert.equal(body.data.scenarioKind, "seeded");
  assert.equal(body.data.expectedCiStatus, "passed");
  assert.equal(body.data.expectedReviewOutcome, "approved");
  assert.equal(body.data.rollbackEligible, false);
});

test("GET /benchmarks/:id returns rollback eligibility for scratch scenarios", () => {
  const response = request("/benchmarks/bm_crosspkg_rollback_audit");
  const body = response.body as { data: Record<string, unknown> };

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "bm_crosspkg_rollback_audit");
  assert.equal(body.data.scenarioId, "scratch-live-cycle");
  assert.equal(body.data.scenarioKind, "scratch");
  assert.equal(body.data.expectedCiStatus, "variable");
  assert.equal(body.data.expectedReviewOutcome, "variable");
  assert.equal(body.data.rollbackEligible, true);
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = request("/benchmarks/missing");
  const body = response.body as { error: { code: string } };

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = request("/tasks");
  const body = response.body as { data: Array<{ id: string; scenarioId: string; status: string; availableActions: string[] }> };

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
});

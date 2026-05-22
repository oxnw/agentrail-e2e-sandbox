import test from "node:test";
import assert from "node:assert/strict";
import type http from "node:http";
import { handleRequest } from "../src/server.js";

function request(path: string) {
  let status = 0;
  let rawBody = "";
  const req = { method: "GET", url: path } as http.IncomingMessage;
  const res = {
    writeHead(code: number) {
      status = code;
    },
    end(body: string) {
      rawBody = body;
    }
  } as http.ServerResponse;

  handleRequest(req, res);

  return {
    status,
    body: JSON.parse(rawBody)
  };
}

test("GET /health returns service status", () => {
  const response = request("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /benchmarks/:id returns a benchmark task", () => {
  const response = request("/benchmarks/bm_api_benchmark_endpoint");

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, "bm_api_benchmark_endpoint");
  assert.equal(response.body.data.scenarioId, "golden-open");
});

test("GET /benchmarks/:id returns 404 for unknown tasks", () => {
  const response = request("/benchmarks/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "not_found");
});

test("GET /tasks returns scenario-aware task snapshots", () => {
  const response = request("/tasks");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.some((task: { id: string }) => task.id === "bm_crosspkg_rollback_audit"));
  const goldenTask = response.body.data.find((task: { scenarioId: string }) => task.scenarioId === "golden-open");
  assert.ok(goldenTask);
  assert.equal(goldenTask.status, "ready_to_ship");
  assert.equal(goldenTask.availableActions.includes("ship"), false);
  assert.equal(goldenTask.reviewRequired, false);

  const changesRequestedTask = response.body.data.find(
    (task: { scenarioId: string }) => task.scenarioId === "failing-open"
  );
  assert.ok(changesRequestedTask);
  assert.equal(changesRequestedTask.reviewRequired, true);

  const variableReviewTask = response.body.data.find(
    (task: { scenarioId: string }) => task.scenarioId === "scratch-live-cycle"
  );
  assert.ok(variableReviewTask);
  assert.equal(variableReviewTask.reviewRequired, false);
});

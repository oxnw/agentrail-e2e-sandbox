import http from "node:http";
import { getBenchmarkTask, getScenario, buildTaskSnapshots, buildTaskSummary } from "./fixtures.js";

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function routeRequest(method: string | undefined, rawUrl: string | undefined) {
  const url = new URL(rawUrl ?? "/", "http://localhost");

  if (method === "GET" && url.pathname === "/health") {
    return { status: 200, body: { status: "ok", service: "agentrail-e2e-sandbox-api" } };
  }

  if (method === "GET" && url.pathname === "/tasks") {
    return { status: 200, body: { data: buildTaskSnapshots() } };
  }

  if (method === "GET" && url.pathname === "/tasks/summary") {
    return { status: 200, body: { data: buildTaskSummary() } };
  }

  const benchmarkMatch = method === "GET" ? url.pathname.match(/^\/benchmarks\/([^/]+)$/) : null;
  if (benchmarkMatch) {
    const task = getBenchmarkTask(benchmarkMatch[1]);
    if (!task) {
      return { status: 404, body: { error: { code: "not_found", message: "Benchmark task was not found." } } };
    }
    return { status: 200, body: { data: task } };
  }

  const scenarioMatch = method === "GET" ? url.pathname.match(/^\/scenarios\/([^/]+)$/) : null;
  if (scenarioMatch) {
    const scenario = getScenario(scenarioMatch[1]);
    if (!scenario) {
      return { status: 404, body: { error: { code: "not_found", message: "Scenario was not found." } } };
    }
    return { status: 200, body: { data: scenario } };
  }

  return { status: 404, body: { error: { code: "not_found", message: "Route was not found." } } };
}

export function createServer() {
  return http.createServer((req, res) => {
    const response = routeRequest(req.method, req.url);
    return json(res, response.status, response.body);
  });
}

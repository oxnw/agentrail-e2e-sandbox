import http from "node:http";
import { getBenchmarkTask, getScenario, buildTaskSnapshots, isTaskPriority, isTaskStatus } from "./fixtures.js";

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { status: "ok", service: "agentrail-e2e-sandbox-api" });
  }

  if (req.method === "GET" && url.pathname === "/tasks") {
    const status = url.searchParams.get("status") ?? undefined;
    const priority = url.searchParams.get("priority") ?? undefined;

    if (status !== undefined && !isTaskStatus(status)) {
      return json(res, 400, {
        error: { code: "invalid_filter", message: `Unsupported task status filter: ${status}` }
      });
    }

    if (priority !== undefined && !isTaskPriority(priority)) {
      return json(res, 400, {
        error: { code: "invalid_filter", message: `Unsupported task priority filter: ${priority}` }
      });
    }

    return json(res, 200, { data: buildTaskSnapshots({ status, priority }) });
  }

  const benchmarkMatch = req.method === "GET" ? url.pathname.match(/^\/benchmarks\/([^/]+)$/) : null;
  if (benchmarkMatch) {
    const task = getBenchmarkTask(benchmarkMatch[1]);
    if (!task) {
      return json(res, 404, { error: { code: "not_found", message: "Benchmark task was not found." } });
    }
    return json(res, 200, { data: task });
  }

  const scenarioMatch = req.method === "GET" ? url.pathname.match(/^\/scenarios\/([^/]+)$/) : null;
  if (scenarioMatch) {
    const scenario = getScenario(scenarioMatch[1]);
    if (!scenario) {
      return json(res, 404, { error: { code: "not_found", message: "Scenario was not found." } });
    }
    return json(res, 200, { data: scenario });
  }

  return json(res, 404, { error: { code: "not_found", message: "Route was not found." } });
}

export function createServer() {
  return http.createServer(handleRequest);
}

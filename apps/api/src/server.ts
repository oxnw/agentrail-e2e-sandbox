import http from "node:http";
import { getBenchmarkTask, getScenario, buildTaskSnapshots, UnsupportedTaskFilterError } from "./fixtures.js";

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function createServer() {
  return http.createServer(handleRequest);
}

export function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { status: "ok", service: "agentrail-e2e-sandbox-api" });
  }

  if (req.method === "GET" && url.pathname === "/tasks") {
    try {
      return json(res, 200, {
        data: buildTaskSnapshots({
          status: url.searchParams.get("status"),
          priority: url.searchParams.get("priority")
        })
      });
    } catch (error) {
      if (error instanceof UnsupportedTaskFilterError) {
        return json(res, 400, {
          error: {
            code: "invalid_filter",
            message: `Unsupported ${error.field} filter value: ${error.value}`
          }
        });
      }
      throw error;
    }
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

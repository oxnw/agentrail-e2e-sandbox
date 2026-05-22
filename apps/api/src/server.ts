import http from "node:http";
import { getBenchmarkTaskDetail, getScenario, buildTaskSnapshots } from "./fixtures.js";

type ApiRequest = Pick<http.IncomingMessage, "method" | "url">;
interface ApiResponse {
  writeHead(status: number, headers: Record<string, string>): unknown;
  end(body: string): unknown;
}

function json(res: ApiResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function handleRequest(req: ApiRequest, res: ApiResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { status: "ok", service: "agentrail-e2e-sandbox-api" });
  }

  if (req.method === "GET" && url.pathname === "/tasks") {
    return json(res, 200, { data: buildTaskSnapshots() });
  }

  const benchmarkMatch = req.method === "GET" ? url.pathname.match(/^\/benchmarks\/([^/]+)$/) : null;
  if (benchmarkMatch) {
    const benchmarkId = decodeURIComponent(benchmarkMatch[1]);
    const task = getBenchmarkTaskDetail(benchmarkId);
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

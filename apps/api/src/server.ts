import http from "node:http";
import { getBenchmarkTask, getScenario, buildTaskSnapshots } from "./fixtures.js";
import type { ApiErrorResponse, ApiSuccessResponse } from "../../../packages/contracts/src/index.js";

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }

  return pathname;
}

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = normalizePathname(url.pathname);

    if (req.method === "GET" && pathname === "/health") {
      return json(res, 200, { status: "ok", service: "agentrail-e2e-sandbox-api" });
    }

    if (req.method === "GET" && pathname === "/tasks") {
      const response = { data: buildTaskSnapshots() } satisfies ApiSuccessResponse<ReturnType<typeof buildTaskSnapshots>>;
      return json(res, 200, response);
    }

    const benchmarkMatch = req.method === "GET" ? pathname.match(/^\/benchmarks\/([^/]+)$/) : null;
    if (benchmarkMatch) {
      const task = getBenchmarkTask(benchmarkMatch[1]);
      if (!task) {
        const response = {
          error: { code: "not_found", message: "Benchmark task was not found." }
        } satisfies ApiErrorResponse;
        return json(res, 404, response);
      }
      const response = { data: task } satisfies ApiSuccessResponse<typeof task>;
      return json(res, 200, response);
    }

    const scenarioMatch = req.method === "GET" ? pathname.match(/^\/scenarios\/([^/]+)$/) : null;
    if (scenarioMatch) {
      const scenario = getScenario(scenarioMatch[1]);
      if (!scenario) {
        const response = {
          error: { code: "not_found", message: "Scenario was not found." }
        } satisfies ApiErrorResponse;
        return json(res, 404, response);
      }
      const response = { data: scenario } satisfies ApiSuccessResponse<typeof scenario>;
      return json(res, 200, response);
    }

    const response = {
      error: { code: "not_found", message: "Route was not found." }
    } satisfies ApiErrorResponse;
    return json(res, 404, response);
  });
}

import http from "node:http";
import { getBenchmarkTask, getScenario, buildTaskSnapshots, isTaskPriority, isTaskStatus } from "./fixtures.js";

type ApiRequest = Pick<http.IncomingMessage, "method" | "url">;
interface JsonResponse {
  writeHead(statusCode: number, headers: Record<string, string>): void;
  end(chunk: string): void;
}

function json(res: JsonResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function createRequestHandler() {
  return (req: ApiRequest, res: JsonResponse) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { status: "ok", service: "agentrail-e2e-sandbox-api" });
    }

    if (req.method === "GET" && url.pathname === "/tasks") {
      const status = url.searchParams.get("status");
      const priority = url.searchParams.get("priority");

      if (status !== null && !isTaskStatus(status)) {
        return json(res, 400, { error: { code: "invalid_filter", message: `Unsupported status filter: ${status}` } });
      }

      if (priority !== null && !isTaskPriority(priority)) {
        return json(res, 400, { error: { code: "invalid_filter", message: `Unsupported priority filter: ${priority}` } });
      }

      const tasks = buildTaskSnapshots().filter((task) => {
        return (status === null || task.status === status) && (priority === null || task.priority === priority);
      });

      return json(res, 200, { data: tasks });
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
  };
}

export function createServer() {
  return http.createServer(createRequestHandler());
}

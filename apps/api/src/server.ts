import http from "node:http";
import type { Priority, TaskStatus } from "../../../packages/contracts/src/index.js";
import { getBenchmarkTask, getScenario, filterTaskSnapshots, TASK_PRIORITIES, TASK_STATUSES } from "./fixtures.js";

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function validateFilter<T extends string>(name: string, value: string | null, allowedValues: readonly T[]): T | undefined {
  if (value === null) {
    return undefined;
  }
  if (allowedValues.includes(value as T)) {
    return value as T;
  }
  throw new Error(`Unsupported ${name} filter value: ${value}`);
}

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { status: "ok", service: "agentrail-e2e-sandbox-api" });
    }

    if (req.method === "GET" && url.pathname === "/tasks") {
      let status: TaskStatus | undefined;
      let priority: Priority | undefined;

      try {
        status = validateFilter("status", url.searchParams.get("status"), TASK_STATUSES);
        priority = validateFilter("priority", url.searchParams.get("priority"), TASK_PRIORITIES);
      } catch (error) {
        return json(res, 400, {
          error: {
            code: "invalid_filter",
            message: error instanceof Error ? error.message : "Unsupported task filter value."
          }
        });
      }

      return json(res, 200, { data: filterTaskSnapshots({ status, priority }) });
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
  });
}

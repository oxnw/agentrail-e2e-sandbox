import http from "node:http";
import type { Priority, TaskStatus } from "../../../packages/contracts/src/index.js";
import { getBenchmarkTask, getScenario, listTaskSnapshots } from "./fixtures.js";

const VALID_TASK_STATUSES = new Set<TaskStatus>(["todo", "in_review", "ready_to_ship"]);
const VALID_PRIORITIES = new Set<Priority>(["critical", "high", "medium", "low"]);

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { status: "ok", service: "agentrail-e2e-sandbox-api" });
    }

    if (req.method === "GET" && url.pathname === "/tasks") {
      const status = validateQueryValue(url.searchParams.get("status"), VALID_TASK_STATUSES, "status");
      if (status.error) {
        return json(res, 400, status.error);
      }

      const priority = validateQueryValue(url.searchParams.get("priority"), VALID_PRIORITIES, "priority");
      if (priority.error) {
        return json(res, 400, priority.error);
      }

      return json(res, 200, { data: listTaskSnapshots({ status: status.value, priority: priority.value }) });
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

function validateQueryValue<T extends string>(
  value: string | null,
  allowedValues: Set<T>,
  field: string
): { value?: T; error?: { error: { code: string; message: string } } } {
  if (value === null) {
    return {};
  }

  if (allowedValues.has(value as T)) {
    return { value: value as T };
  }

  return {
    error: {
      error: {
        code: "invalid_filter",
        message: `Unsupported ${field} filter value: ${value}`
      }
    }
  };
}

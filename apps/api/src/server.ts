import http from "node:http";
import type { Priority, TaskSnapshot, TaskStatus } from "../../../packages/contracts/src/index.js";
import { getBenchmarkTask, getScenario, buildTaskSnapshots, TASK_PRIORITIES, TASK_STATUSES } from "./fixtures.js";

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function readFilter<T extends string>(url: URL, name: string, allowedValues: readonly T[]): T | null {
  const value = url.searchParams.get(name);
  if (value === null) {
    return null;
  }
  if (!allowedValues.includes(value as T)) {
    throw new Error(`Unsupported ${name} filter: ${value}`);
  }
  return value as T;
}

function filterTaskSnapshots(
  tasks: TaskSnapshot[],
  filters: { status: TaskStatus | null; priority: Priority | null }
) {
  return tasks.filter((task) => {
    if (filters.status !== null && task.status !== filters.status) {
      return false;
    }
    if (filters.priority !== null && task.priority !== filters.priority) {
      return false;
    }
    return true;
  });
}

export function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { status: "ok", service: "agentrail-e2e-sandbox-api" });
    }

    if (req.method === "GET" && url.pathname === "/tasks") {
      try {
        const filters = {
          status: readFilter(url, "status", TASK_STATUSES),
          priority: readFilter(url, "priority", TASK_PRIORITIES)
        };
        return json(res, 200, { data: filterTaskSnapshots(buildTaskSnapshots(), filters) });
      } catch (error) {
        return json(res, 400, {
          error: {
            code: "invalid_filter",
            message: error instanceof Error ? error.message : "Unsupported task filter."
          }
        });
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
  });
}

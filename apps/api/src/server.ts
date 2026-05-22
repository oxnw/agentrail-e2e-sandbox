import http from "node:http";
import type { Priority, TaskStatus } from "../../../packages/contracts/src/index.js";
import { getBenchmarkTask, getScenario, buildTaskSnapshots } from "./fixtures.js";

const TASK_STATUSES = ["todo", "in_review", "ready_to_ship"] as const;
const PRIORITIES = ["critical", "high", "medium", "low"] as const;

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
      const status = parseTaskStatus(url.searchParams.get("status"));
      if (status === "invalid") {
        return json(res, 400, { error: { code: "invalid_filter", message: "Unsupported task status filter." } });
      }

      const priority = parsePriority(url.searchParams.get("priority"));
      if (priority === "invalid") {
        return json(res, 400, { error: { code: "invalid_filter", message: "Unsupported task priority filter." } });
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
  });
}

function parseTaskStatus(value: string | null): TaskStatus | undefined | "invalid" {
  if (value === null) {
    return undefined;
  }
  return isTaskStatus(value) ? value : "invalid";
}

function parsePriority(value: string | null): Priority | undefined | "invalid" {
  if (value === null) {
    return undefined;
  }
  return isPriority(value) ? value : "invalid";
}

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.some((status) => status === value);
}

function isPriority(value: string): value is Priority {
  return PRIORITIES.some((priority) => priority === value);
}

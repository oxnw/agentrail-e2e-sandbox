import http from "node:http";
import { getBenchmarkTask, getScenario, buildTaskSnapshotById, buildTaskSnapshots } from "./fixtures.js";

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
      return json(res, 200, { data: buildTaskSnapshots() });
    }

    if (req.method === "GET" && url.pathname === "/tasks/summary") {
      const tasks = buildTaskSnapshots();
      const summary = tasks.reduce(
        (accumulator, task) => {
          accumulator.byStatus[task.status] += 1;
          if (task.rollbackEligible) {
            accumulator.rollbackEligible += 1;
          }
          return accumulator;
        },
        {
          total: tasks.length,
          rollbackEligible: 0,
          byStatus: {
            todo: 0,
            in_review: 0,
            ready_to_ship: 0
          }
        }
      );

      return json(res, 200, { data: summary });
    }

    const taskMatch = req.method === "GET" ? url.pathname.match(/^\/tasks\/([^/]+)$/) : null;
    if (taskMatch) {
      const task = buildTaskSnapshotById(taskMatch[1]);
      if (!task) {
        return json(res, 404, { error: { code: "not_found", message: "Task was not found." } });
      }
      return json(res, 200, { data: task });
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

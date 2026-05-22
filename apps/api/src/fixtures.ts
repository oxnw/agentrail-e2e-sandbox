import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type { BenchmarkCatalog, BenchmarkTask, ScenarioManifest, TaskSnapshot } from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;
const fixtureTasks: BenchmarkTask[] = [
  ...catalog.tasks,
  {
    id: "bm_api_task_detail",
    title: "Add task detail lookups by task id",
    issueSlug: "benchmark-api-task-detail-lookup",
    scenarioId: "scratch-live-cycle",
    priority: "medium",
    packages: ["apps/api"],
    taskType: "api_feature",
    acceptanceCriteria: [
      "GET /tasks/bm_api_task_detail returns that task snapshot.",
      "Unknown task ids return a 404 JSON error.",
      "GET /tasks/summary is not shadowed by the dynamic route."
    ],
    expectedChangedPaths: ["apps/api/src/fixtures.ts", "apps/api/src/server.ts", "apps/api/test/server.test.ts"],
    requiredChecks: ["API unit tests"],
    requiredArtifacts: ["test_evidence"],
    scoring: {
      correctness: 0.5,
      tests: 0.25,
      route_ordering: 0.15,
      scope_control: 0.1
    }
  }
];

export function listScenarios() {
  return manifest.scenarios;
}

export function getScenario(id: string) {
  return manifest.scenarios.find((scenario) => scenario.id === id) ?? null;
}

export function listBenchmarkTasks() {
  return fixtureTasks;
}

export function getBenchmarkTask(id: string) {
  return fixtureTasks.find((task) => task.id === id) ?? null;
}

export function buildTaskSnapshots(): TaskSnapshot[] {
  return fixtureTasks.map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }));
}

export function getTaskSnapshot(id: string): TaskSnapshot | null {
  const task = getBenchmarkTask(id);
  return task ? buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }) : null;
}

export function summarizeTaskSnapshots() {
  const tasks = buildTaskSnapshots();
  return {
    total: tasks.length,
    byStatus: tasks.reduce<Record<string, number>>((counts, task) => {
      counts[task.status] = (counts[task.status] ?? 0) + 1;
      return counts;
    }, {})
  };
}

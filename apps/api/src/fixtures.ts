import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type { BenchmarkCatalog, ScenarioManifest, TaskSnapshot } from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;
const taskDetailBenchmarkTask = {
  id: "bm_api_task_detail",
  title: "Add task detail lookups by task id",
  issueSlug: "benchmark-api-task-detail-lookup",
  scenarioId: "golden-open",
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
  requiredArtifacts: [],
  scoring: {
    correctness: 0.6,
    tests: 0.25,
    api_behavior: 0.15
  }
} satisfies BenchmarkCatalog["tasks"][number];
const benchmarkTasks = [
  ...catalog.tasks,
  taskDetailBenchmarkTask
];

export function listScenarios() {
  return manifest.scenarios;
}

export function getScenario(id: string) {
  return manifest.scenarios.find((scenario) => scenario.id === id) ?? null;
}

export function listBenchmarkTasks() {
  return benchmarkTasks;
}

export function getBenchmarkTask(id: string) {
  return benchmarkTasks.find((task) => task.id === id) ?? null;
}

export function buildTaskSnapshots(): TaskSnapshot[] {
  return benchmarkTasks.map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }));
}

export function buildTaskSnapshotById(id: string): TaskSnapshot | null {
  const task = getBenchmarkTask(id);
  if (!task) {
    return null;
  }
  return buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) });
}

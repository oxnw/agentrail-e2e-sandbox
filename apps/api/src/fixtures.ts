import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type { BenchmarkCatalog, BenchmarkTask, ScenarioManifest, TaskSnapshot } from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;
const apiFixtureTasks: BenchmarkTask[] = [
  ...catalog.tasks,
  {
    id: "bm_api_task_detail",
    title: "Add task detail lookups by task id",
    issueSlug: "benchmark-api-task-detail-lookup",
    scenarioId: "golden-open",
    priority: "medium",
    packages: ["apps/api"],
    taskType: "api_feature",
    acceptanceCriteria: [
      "GET /tasks/:id returns a single task snapshot.",
      "Unknown task ids return 404 JSON responses.",
      "Static task routes are not shadowed by the detail lookup."
    ],
    expectedChangedPaths: ["apps/api/src/fixtures.ts", "apps/api/src/server.ts", "apps/api/test/server.test.ts"],
    requiredChecks: ["API unit tests"],
    requiredArtifacts: ["test_evidence"],
    scoring: {
      correctness: 0.55,
      tests: 0.25,
      api_behavior: 0.15,
      scope_control: 0.05
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
  return apiFixtureTasks;
}

export function getBenchmarkTask(id: string) {
  return apiFixtureTasks.find((task) => task.id === id) ?? null;
}

export function buildTaskSnapshots(): TaskSnapshot[] {
  return apiFixtureTasks.map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }));
}

export function getTaskSnapshot(id: string): TaskSnapshot | null {
  const task = getBenchmarkTask(id);
  if (!task) {
    return null;
  }

  return buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) });
}

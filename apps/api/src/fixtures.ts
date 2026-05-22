import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type {
  BenchmarkCatalog,
  BenchmarkTask,
  CiStatus,
  ReviewOutcome,
  ScenarioKind,
  ScenarioManifest,
  TaskSnapshot
} from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;

export interface BenchmarkDetail extends BenchmarkTask {
  scenarioKind: ScenarioKind | null;
  expectedCiStatus: CiStatus;
  expectedReviewOutcome: ReviewOutcome;
  rollbackEligible: boolean;
}

export function listScenarios() {
  return manifest.scenarios;
}

export function getScenario(id: string) {
  return manifest.scenarios.find((scenario) => scenario.id === id) ?? null;
}

export function listBenchmarkTasks() {
  return catalog.tasks;
}

export function getBenchmarkTask(id: string) {
  return catalog.tasks.find((task) => task.id === id) ?? null;
}

export function getBenchmarkDetail(id: string): BenchmarkDetail | null {
  const task = getBenchmarkTask(id);
  if (!task) {
    return null;
  }

  const scenario = getScenario(task.scenarioId);

  return {
    ...task,
    scenarioKind: scenario?.kind ?? null,
    expectedCiStatus: scenario?.expectedCiStatus ?? "variable",
    expectedReviewOutcome: scenario?.expectedReviewOutcome ?? "variable",
    rollbackEligible: Boolean(scenario?.allowRollback)
  };
}

export function buildTaskSnapshots(): TaskSnapshot[] {
  return catalog.tasks.map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }));
}

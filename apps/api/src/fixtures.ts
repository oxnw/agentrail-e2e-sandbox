import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type { BenchmarkCatalog, ScenarioManifest, TaskSnapshot } from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;

type BenchmarkTaskDetail = BenchmarkCatalog["tasks"][number] & {
  scenarioKind: ScenarioManifest["scenarios"][number]["kind"] | null;
  expectedCiStatus: ScenarioManifest["scenarios"][number]["expectedCiStatus"] | null;
  expectedReviewOutcome: ScenarioManifest["scenarios"][number]["expectedReviewOutcome"] | null;
  rollbackEligible: boolean;
};

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

export function getBenchmarkTaskDetail(id: string): BenchmarkTaskDetail | null {
  const task = getBenchmarkTask(id);
  if (!task) {
    return null;
  }

  const scenario = getScenario(task.scenarioId);

  return {
    ...task,
    scenarioKind: scenario?.kind ?? null,
    expectedCiStatus: scenario?.expectedCiStatus ?? null,
    expectedReviewOutcome: scenario?.expectedReviewOutcome ?? null,
    rollbackEligible: Boolean(scenario?.allowRollback)
  };
}

export function buildTaskSnapshots(): TaskSnapshot[] {
  return catalog.tasks.map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }));
}

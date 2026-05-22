import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type { BenchmarkCatalog, ScenarioManifest, TaskSnapshot } from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;

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

export function buildTaskSnapshots(): TaskSnapshot[] {
  return catalog.tasks.map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }));
}

export function getTaskSnapshot(id: string): TaskSnapshot | null {
  const task = getBenchmarkTask(id);
  if (!task) {
    return null;
  }

  return buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) });
}

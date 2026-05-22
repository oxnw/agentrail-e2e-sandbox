import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type { BenchmarkCatalog, Priority, ScenarioManifest, TaskSnapshot, TaskStatus } from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;
const TASK_STATUSES = new Set<TaskStatus>(["todo", "in_review", "ready_to_ship"]);
const TASK_PRIORITIES = new Set<Priority>(["critical", "high", "medium", "low"]);

export interface TaskSnapshotFilters {
  status?: TaskStatus;
  priority?: Priority;
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

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.has(value as TaskStatus);
}

export function isTaskPriority(value: string): value is Priority {
  return TASK_PRIORITIES.has(value as Priority);
}

export function buildTaskSnapshots(filters: TaskSnapshotFilters = {}): TaskSnapshot[] {
  return catalog.tasks
    .map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }))
    .filter((task) => filters.status === undefined || task.status === filters.status)
    .filter((task) => filters.priority === undefined || task.priority === filters.priority);
}

import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type { BenchmarkCatalog, Priority, ScenarioManifest, TaskSnapshot, TaskStatus } from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;
const taskStatuses = new Set<TaskStatus>(["todo", "in_review", "ready_to_ship"]);
const taskPriorities = new Set<Priority>(["critical", "high", "medium", "low"]);

export interface TaskSnapshotFilters {
  status?: string | null;
  priority?: string | null;
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

export function buildTaskSnapshots(filters: TaskSnapshotFilters = {}): TaskSnapshot[] {
  const { status, priority } = validateTaskSnapshotFilters(filters);
  return catalog.tasks
    .map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }))
    .filter((task) => (status ? task.status === status : true))
    .filter((task) => (priority ? task.priority === priority : true));
}

function validateTaskSnapshotFilters(filters: TaskSnapshotFilters) {
  const status = normalizeFilterValue(filters.status);
  const priority = normalizeFilterValue(filters.priority);

  if (status && !taskStatuses.has(status as TaskStatus)) {
    throw new Error(`Unsupported task status filter: ${status}`);
  }
  if (priority && !taskPriorities.has(priority as Priority)) {
    throw new Error(`Unsupported task priority filter: ${priority}`);
  }

  return { status: status as TaskStatus | undefined, priority: priority as Priority | undefined };
}

function normalizeFilterValue(value?: string | null) {
  return value?.trim() || undefined;
}

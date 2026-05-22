import benchmarkCatalog from "../../../benchmarks/catalog.json" with { type: "json" };
import scenarioManifest from "../../../scenarios/manifest.json" with { type: "json" };
import type { BenchmarkCatalog, Priority, ScenarioManifest, TaskSnapshot, TaskStatus } from "../../../packages/contracts/src/index.js";
import { buildTaskSnapshot } from "../../../packages/task-engine/src/index.js";

const catalog = benchmarkCatalog as unknown as BenchmarkCatalog;
const manifest = scenarioManifest as unknown as ScenarioManifest;
const TASK_STATUSES = new Set<TaskStatus>(["todo", "in_review", "ready_to_ship"]);
const TASK_PRIORITIES = new Set<Priority>(["critical", "high", "medium", "low"]);

export class UnsupportedTaskFilterError extends Error {
  constructor(
    public readonly field: "status" | "priority",
    public readonly value: string
  ) {
    super(`Unsupported task ${field} filter: ${value}`);
  }
}

export interface TaskFilters {
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

export function buildTaskSnapshots(filters: TaskFilters = {}): TaskSnapshot[] {
  const status = validateStatusFilter(filters.status);
  const priority = validatePriorityFilter(filters.priority);

  return catalog.tasks
    .map((task) => buildTaskSnapshot({ task, scenario: getScenario(task.scenarioId) }))
    .filter((task) => status === undefined || task.status === status)
    .filter((task) => priority === undefined || task.priority === priority);
}

function validateStatusFilter(value: string | null | undefined): TaskStatus | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!TASK_STATUSES.has(value as TaskStatus)) {
    throw new UnsupportedTaskFilterError("status", value);
  }
  return value as TaskStatus;
}

function validatePriorityFilter(value: string | null | undefined): Priority | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!TASK_PRIORITIES.has(value as Priority)) {
    throw new UnsupportedTaskFilterError("priority", value);
  }
  return value as Priority;
}

import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../scenarios/manifest.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(catalogPath(), "utf8"));
const scenarioIds = new Set(manifest.scenarios.map((scenario) => scenario.id));
const validPriorities = new Set(["critical", "high", "medium", "low"]);

if (process.argv.includes("--self-test-duplicate-ids")) {
  runDuplicateIdSelfTest();
  process.exit(0);
}

if (catalog.version !== 1) {
  throw new Error(`Unsupported benchmark catalog version: ${catalog.version}`);
}

if (!Array.isArray(catalog.tasks) || catalog.tasks.length === 0) {
  throw new Error("Benchmark catalog must contain at least one task.");
}

const taskIds = new Set();

for (const task of catalog.tasks) {
  requireString(task.id, "task.id");
  requireUniqueTaskId(task.id, taskIds);

  requireString(task.title, `task.title for ${task.id}`);
  requireString(task.issueSlug, `task.issueSlug for ${task.id}`);
  requireString(task.scenarioId, `task.scenarioId for ${task.id}`);
  requireString(task.priority, `task.priority for ${task.id}`);

  if (!scenarioIds.has(task.scenarioId)) {
    throw new Error(`Task ${task.id} references unknown scenario ${task.scenarioId}.`);
  }
  if (!validPriorities.has(task.priority)) {
    throw new Error(`Task ${task.id} has invalid priority ${task.priority}.`);
  }

  requireArray(task.acceptanceCriteria, `task.acceptanceCriteria for ${task.id}`);
  requireArray(task.expectedChangedPaths, `task.expectedChangedPaths for ${task.id}`);
  requireArray(task.requiredChecks, `task.requiredChecks for ${task.id}`);
  requireArray(task.requiredArtifacts, `task.requiredArtifacts for ${task.id}`);

  if (typeof task.scoring !== "object" || task.scoring === null) {
    throw new Error(`Task ${task.id} is missing scoring.`);
  }

  const scoreTotal = Object.values(task.scoring).reduce((sum, value) => sum + Number(value), 0);
  if (Math.abs(scoreTotal - 1) > 0.001) {
    throw new Error(`Task ${task.id} scoring must sum to 1. Found ${scoreTotal}.`);
  }
}

console.log(`Validated ${catalog.tasks.length} benchmark tasks.`);

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${label}.`);
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Missing ${label}.`);
  }
}

function requireUniqueTaskId(taskId, taskIds) {
  if (taskIds.has(taskId)) {
    throw new Error(`Duplicate benchmark task id: ${taskId}.`);
  }
  taskIds.add(taskId);
}

function catalogPath() {
  const catalogArg = process.argv.find((arg) => arg.startsWith("--catalog="));
  return catalogArg ? catalogArg.slice("--catalog=".length) : new URL("../benchmarks/catalog.json", import.meta.url);
}

function runDuplicateIdSelfTest() {
  const duplicateId = "bm_duplicate_fixture";
  const seenTaskIds = new Set([duplicateId]);

  try {
    requireUniqueTaskId(duplicateId, seenTaskIds);
  } catch (error) {
    if (error instanceof Error && error.message.includes(duplicateId)) {
      console.log(`Duplicate task id self-test passed for ${duplicateId}.`);
      return;
    }
    throw error;
  }

  throw new Error("Duplicate task id self-test did not reject a duplicate id.");
}

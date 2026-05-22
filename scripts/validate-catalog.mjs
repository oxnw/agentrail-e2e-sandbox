import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const validPriorities = new Set(["critical", "high", "medium", "low"]);

if (isMainModule()) {
  const manifest = JSON.parse(await readFile(new URL("../scenarios/manifest.json", import.meta.url), "utf8"));
  const catalog = JSON.parse(await readFile(new URL("../benchmarks/catalog.json", import.meta.url), "utf8"));

  validateCatalog(catalog, manifest);

  console.log(`Validated ${catalog.tasks.length} benchmark tasks.`);
}

export function validateCatalog(catalog, manifest) {
  const scenarioIds = new Set(manifest.scenarios.map((scenario) => scenario.id));
  const taskIds = new Set();

  if (catalog.version !== 1) {
    throw new Error(`Unsupported benchmark catalog version: ${catalog.version}`);
  }

  if (!Array.isArray(catalog.tasks) || catalog.tasks.length === 0) {
    throw new Error("Benchmark catalog must contain at least one task.");
  }

  for (const task of catalog.tasks) {
    requireString(task.id, "task.id");
    if (taskIds.has(task.id)) {
      throw new Error(`Duplicate benchmark task id: ${task.id}.`);
    }
    taskIds.add(task.id);

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
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

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

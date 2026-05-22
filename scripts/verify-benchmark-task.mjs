import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const args = parseArgs(process.argv.slice(2));
const catalog = JSON.parse(await readFile(new URL("../benchmarks/catalog.json", import.meta.url), "utf8"));
const task = catalog.tasks.find((candidate) => candidate.id === args.taskId);

if (!task) {
  throw new Error(`Unknown benchmark task id: ${args.taskId}`);
}

validateTaskDefinition(task);
await validateChangedFiles(task, args.baseRef);

if (!args.skipCommand) {
  await runValidationCommand(task.validationCommand);
}

console.log(`Verified benchmark task ${task.id}.`);

function parseArgs(argv) {
  const parsed = {
    taskId: null,
    baseRef: "origin/main",
    skipCommand: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--task":
        parsed.taskId = readNext(argv, ++index, arg);
        break;
      case "--base":
        parsed.baseRef = readNext(argv, ++index, arg);
        break;
      case "--skip-command":
        parsed.skipCommand = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!parsed.taskId) {
    throw new Error("Usage: node scripts/verify-benchmark-task.mjs --task <task-id> [--base <ref>] [--skip-command]");
  }

  return parsed;
}

function readNext(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function validateTaskDefinition(task) {
  const requiredStringFields = [
    "id",
    "title",
    "issueBody",
    "issueSlug",
    "scenarioId",
    "priority",
    "taskType",
    "difficulty",
    "validationCommand"
  ];
  for (const field of requiredStringFields) {
    if (typeof task[field] !== "string" || task[field].length === 0) {
      throw new Error(`Task ${task.id ?? "(unknown)"} is missing ${field}.`);
    }
  }

  for (const field of ["acceptanceCriteria", "expectedChangedPaths", "successCriteria", "requiredChecks", "requiredArtifacts"]) {
    if (!Array.isArray(task[field]) || task[field].length === 0) {
      throw new Error(`Task ${task.id} is missing ${field}.`);
    }
  }

  const scoreTotal = Object.values(task.scoring ?? {}).reduce((sum, value) => sum + Number(value), 0);
  if (Math.abs(scoreTotal - 1) > 0.001) {
    throw new Error(`Task ${task.id} scoring must sum to 1. Found ${scoreTotal}.`);
  }
}

async function validateChangedFiles(task, baseRef) {
  let stdout = "";
  try {
    ({ stdout } = await execFileAsync("git", ["diff", "--name-only", `${baseRef}...HEAD`]));
  } catch {
    return;
  }

  const changedFiles = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((filePath) => !filePath.startsWith("dist/"));

  if (changedFiles.length === 0) {
    return;
  }

  const allowed = new Set(task.expectedChangedPaths);
  const unexpected = changedFiles.filter((filePath) => !allowed.has(filePath));
  if (unexpected.length > 0) {
    throw new Error(`Task ${task.id} changed files outside expectedChangedPaths: ${unexpected.join(", ")}`);
  }
}

async function runValidationCommand(command) {
  const result = await execFileAsync("sh", ["-c", command], {
    maxBuffer: 1024 * 1024 * 10
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

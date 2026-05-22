import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_NODE_MAJOR = 20;
const rootDir = process.cwd();

function fail(message, details = []) {
  console.error(`Setup check failed: ${message}`);

  for (const detail of details) {
    console.error(`- ${detail}`);
  }

  process.exit(1);
}

async function pathExists(relativePath) {
  try {
    await access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

function validateNodeVersion() {
  const major = Number.parseInt(process.versions.node.split(".")[0], 10);

  if (!Number.isInteger(major) || major < REQUIRED_NODE_MAJOR) {
    fail(`Node.js ${REQUIRED_NODE_MAJOR} or newer is required.`, [
      `Current version: ${process.version}`,
      "Install a supported Node.js version, then run npm ci.",
    ]);
  }
}

async function readPackageLock() {
  try {
    return JSON.parse(await readFile(path.join(rootDir, "package-lock.json"), "utf8"));
  } catch (error) {
    fail("Could not read package-lock.json.", [
      error instanceof Error ? error.message : String(error),
    ]);
  }
}

function getLockedNodeModules(packageLock) {
  if (!packageLock || typeof packageLock !== "object" || !packageLock.packages) {
    fail("package-lock.json does not contain lockfile package entries.");
  }

  return Object.keys(packageLock.packages)
    .filter((packagePath) => packagePath.startsWith("node_modules/"))
    .sort();
}

async function validateInstalledDependencies(lockedNodeModules) {
  if (!(await pathExists("node_modules"))) {
    fail("node_modules is missing.", [
      "Run npm ci from the repository root to install workspace dependencies.",
    ]);
  }

  const missingDependencies = [];

  for (const dependencyPath of lockedNodeModules) {
    if (!(await pathExists(dependencyPath))) {
      missingDependencies.push(dependencyPath);
    }
  }

  if (missingDependencies.length > 0) {
    fail("Some lockfile-defined workspace dependencies are not installed.", [
      ...missingDependencies.map((dependencyPath) => `Missing ${dependencyPath}`),
      "Run npm ci from the repository root to restore node_modules.",
    ]);
  }
}

validateNodeVersion();
const packageLock = await readPackageLock();
await validateInstalledDependencies(getLockedNodeModules(packageLock));

console.log("Setup check passed.");

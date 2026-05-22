import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MIN_NODE_MAJOR = 20;
const rootDir = process.cwd();
const npmCiHint = "Run `npm ci` from the repository root to install workspace dependencies.";
const nodeVersionHint = "Install Node.js 20 or newer before running workspace commands.";

function fail(message, detail) {
  console.error(`Setup check failed: ${message}`);
  if (detail) {
    console.error(detail);
  }
  process.exit(1);
}

function nodeMajor(version) {
  const match = /^v?(\d+)\./.exec(version);
  return match ? Number(match[1]) : Number.NaN;
}

async function exists(relativePath) {
  try {
    await access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readLockfile() {
  const lockfilePath = path.join(rootDir, "package-lock.json");

  try {
    return JSON.parse(await readFile(lockfilePath, "utf8"));
  } catch (error) {
    fail("package-lock.json could not be read.", error.message);
  }
}

const major = nodeMajor(process.version);
if (!Number.isInteger(major) || major < MIN_NODE_MAJOR) {
  fail(
    `Node.js ${MIN_NODE_MAJOR} or newer is required. Current version: ${process.version}.`,
    nodeVersionHint,
  );
}

const lockfile = await readLockfile();
const lockedPackages = lockfile?.packages;
if (!lockedPackages || typeof lockedPackages !== "object") {
  fail("package-lock.json does not contain npm lockfile package data.", npmCiHint);
}

if (!(await exists("node_modules"))) {
  fail("node_modules is missing.", npmCiHint);
}

const lockedNodeModules = Object.keys(lockedPackages)
  .filter((packagePath) => packagePath.startsWith("node_modules/"))
  .sort();

const missingPackages = [];
for (const packagePath of lockedNodeModules) {
  if (!(await exists(packagePath))) {
    missingPackages.push(packagePath);
  }
}

if (missingPackages.length > 0) {
  const packageList = missingPackages.map((packagePath) => `- ${packagePath}`).join("\n");
  fail(
    "lockfile-defined workspace dependencies are not installed.",
    `${packageList}\n${npmCiHint}`,
  );
}

console.log(`Setup check passed: Node ${process.versions.node} and workspace dependencies are installed.`);

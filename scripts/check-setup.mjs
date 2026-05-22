import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const MIN_NODE_MAJOR = 20;
const rootDir = process.cwd();
const npmCiHint = "Run `npm ci` from the repository root to install workspace dependencies.";

function fail(message) {
  console.error(`Setup check failed: ${message}`);
  process.exit(1);
}

async function pathExists(filePath) {
  try {
    await access(filePath);
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
    fail(`Unable to read package-lock.json: ${error.message}`);
    return null;
  }
}

function expectedInstalledPackages(lockfile) {
  return Object.keys(lockfile.packages ?? {})
    .filter((packagePath) => packagePath.startsWith("node_modules/"))
    .sort();
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);

if (!Number.isInteger(nodeMajor) || nodeMajor < MIN_NODE_MAJOR) {
  fail(
    `Node.js ${MIN_NODE_MAJOR} or newer is required. Current version: ${process.version}.`,
  );
}

const nodeModulesPath = path.join(rootDir, "node_modules");

if (!(await pathExists(nodeModulesPath))) {
  fail(`Missing node_modules directory. ${npmCiHint}`);
}

try {
  const nodeModulesStat = await stat(nodeModulesPath);

  if (!nodeModulesStat.isDirectory()) {
    fail(`node_modules exists but is not a directory. ${npmCiHint}`);
  }
} catch (error) {
  fail(`Unable to inspect node_modules: ${error.message}. ${npmCiHint}`);
}

const lockfile = await readLockfile();
const missingPackages = lockfile
  ? (
      await Promise.all(
        expectedInstalledPackages(lockfile).map(async (packagePath) => ({
          packagePath,
          installed: await pathExists(path.join(rootDir, packagePath)),
        })),
      )
    )
      .filter(({ installed }) => !installed)
      .map(({ packagePath }) => packagePath)
  : [];

if (missingPackages.length > 0) {
  fail(
    `Missing lockfile-defined dependency entries: ${missingPackages.join(", ")}. ${npmCiHint}`,
  );
}

console.log("Setup check passed.");

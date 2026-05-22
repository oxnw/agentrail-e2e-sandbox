import { access, readFile } from "node:fs/promises";

const minimumNodeMajor = 20;
const repoRoot = new URL("../", import.meta.url);
const lockfileUrl = new URL("package-lock.json", repoRoot);

function fail(message) {
  console.error(`Setup check failed: ${message}`);
  process.exitCode = 1;
}

function parseNodeMajor(version) {
  const match = /^v?(\d+)/.exec(version);
  return match ? Number.parseInt(match[1], 10) : NaN;
}

async function exists(url) {
  try {
    await access(url);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

const currentNodeMajor = parseNodeMajor(process.version);
if (!Number.isInteger(currentNodeMajor) || currentNodeMajor < minimumNodeMajor) {
  fail(
    `Node.js ${minimumNodeMajor} or newer is required. Current version: ${process.version}.`,
  );
}

let lockfile;
try {
  lockfile = JSON.parse(await readFile(lockfileUrl, "utf8"));
} catch (error) {
  fail(`Could not read package-lock.json: ${error.message}. Run npm ci and try again.`);
}

const packageEntries = Object.keys(lockfile?.packages ?? {});
const installedPackagePaths = packageEntries.filter((packagePath) =>
  packagePath.startsWith("node_modules/"),
);

if (installedPackagePaths.length === 0) {
  fail("package-lock.json does not list installed dependencies. Run npm ci and try again.");
}

const missingPackagePaths = [];
for (const packagePath of installedPackagePaths) {
  const packageUrl = new URL(packagePath, repoRoot);
  if (!(await exists(packageUrl))) {
    missingPackagePaths.push(packagePath);
  }
}

if (missingPackagePaths.length > 0) {
  const missingList = missingPackagePaths
    .slice(0, 5)
    .map((packagePath) => `  - ${packagePath}`)
    .join("\n");
  const extraCount = missingPackagePaths.length - 5;
  const extraLine = extraCount > 0 ? `\n  ...and ${extraCount} more` : "";

  fail(
    [
      "Workspace dependencies are missing from node_modules.",
      "Run npm ci in the repository root, then retry npm run check:setup.",
      "Missing lockfile-defined packages:",
      `${missingList}${extraLine}`,
    ].join("\n"),
  );
}

if (process.exitCode) {
  process.exit();
}

console.log(
  `Setup check passed: Node ${process.versions.node} and ${installedPackagePaths.length} lockfile-defined dependencies are installed.`,
);

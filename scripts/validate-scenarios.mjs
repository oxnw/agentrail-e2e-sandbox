import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../scenarios/manifest.json", import.meta.url), "utf8"));

if (manifest.version !== 1) {
  throw new Error(`Unsupported scenario manifest version: ${manifest.version}`);
}

if (!Array.isArray(manifest.scenarios) || manifest.scenarios.length === 0) {
  throw new Error("Scenario manifest must contain at least one scenario.");
}

const seen = new Set();
for (const scenario of manifest.scenarios) {
  requireString(scenario.id, "scenario.id");
  requireString(scenario.kind, `scenario.kind for ${scenario.id}`);
  requireString(scenario.issueSlug, `scenario.issueSlug for ${scenario.id}`);
  requireString(scenario.branch, `scenario.branch for ${scenario.id}`);
  requireString(scenario.baseBranch, `scenario.baseBranch for ${scenario.id}`);
  requireString(scenario.shipTargetBranch, `scenario.shipTargetBranch for ${scenario.id}`);
  requireString(scenario.expectedCiStatus, `scenario.expectedCiStatus for ${scenario.id}`);
  requireString(scenario.expectedReviewOutcome, `scenario.expectedReviewOutcome for ${scenario.id}`);
  requireObject(scenario.live, `scenario.live for ${scenario.id}`);

  if (seen.has(scenario.id)) {
    throw new Error(`Duplicate scenario id: ${scenario.id}`);
  }
  seen.add(scenario.id);

  if (!["seeded", "scratch"].includes(scenario.kind)) {
    throw new Error(`Scenario ${scenario.id} has unsupported kind: ${scenario.kind}`);
  }

  if (scenario.kind === "seeded" && scenario.branch.includes("<")) {
    throw new Error(`Seeded scenario ${scenario.id} must use a fixed branch name.`);
  }

  if (scenario.kind === "scratch" && !scenario.branch.startsWith("scratch/")) {
    throw new Error(`Scratch scenario ${scenario.id} must use a scratch/* branch convention.`);
  }

  for (const key of ["allowSubmit", "allowShip", "allowRollback"]) {
    if (typeof scenario[key] !== "boolean") {
      throw new Error(`Scenario ${scenario.id} is missing boolean ${key}.`);
    }
  }

  requireString(scenario.live.owner, `scenario.live.owner for ${scenario.id}`);
  requireString(scenario.live.repo, `scenario.live.repo for ${scenario.id}`);
  if (scenario.kind === "seeded") {
    requirePositiveInteger(scenario.live.issueNumber, `scenario.live.issueNumber for ${scenario.id}`);
    requirePositiveInteger(scenario.live.pullNumber, `scenario.live.pullNumber for ${scenario.id}`);
    requireString(scenario.live.headBranch, `scenario.live.headBranch for ${scenario.id}`);
  } else {
    optionalPositiveInteger(scenario.live.issueNumber, `scenario.live.issueNumber for ${scenario.id}`);
    optionalPositiveInteger(scenario.live.pullNumber, `scenario.live.pullNumber for ${scenario.id}`);
    optionalString(scenario.live.headBranch, `scenario.live.headBranch for ${scenario.id}`);
  }
  optionalString(scenario.live.expectedHeadSha, `scenario.live.expectedHeadSha for ${scenario.id}`);
}

console.log(`Validated ${manifest.scenarios.length} scenarios.`);

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${label}.`);
  }
}

function optionalString(value, label) {
  if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
    throw new Error(`Invalid ${label}.`);
  }
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Missing ${label}.`);
  }
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`Missing ${label}.`);
  }
}

function optionalPositiveInteger(value, label) {
  if (value !== undefined && (!Number.isInteger(value) || Number(value) <= 0)) {
    throw new Error(`Invalid ${label}.`);
  }
}

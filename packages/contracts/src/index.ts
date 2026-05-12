export type ScenarioKind = "seeded" | "scratch";
export type ReviewOutcome = "approved" | "changes_requested" | "pending" | "variable";
export type CiStatus = "passed" | "failed" | "flaky" | "variable";
export type TaskStatus = "todo" | "in_review" | "ready_to_ship";
export type Priority = "critical" | "high" | "medium" | "low";

export interface ScenarioLiveConfig {
  owner: string;
  repo: string;
  issueNumber?: number;
  pullNumber?: number;
  headBranch?: string;
  expectedHeadSha?: string;
}

export interface ScenarioDefinition {
  id: string;
  kind: ScenarioKind;
  issueSlug: string;
  branch: string;
  baseBranch: string;
  shipTargetBranch: string;
  expectedCiStatus: CiStatus;
  expectedReviewOutcome: ReviewOutcome;
  allowSubmit: boolean;
  allowShip: boolean;
  allowRollback: boolean;
  live: ScenarioLiveConfig;
  notes: string;
}

export interface ScenarioManifest {
  version: number;
  defaultScratchBaseBranch: string;
  scenarios: ScenarioDefinition[];
}

export interface BenchmarkTask {
  id: string;
  title: string;
  issueSlug: string;
  scenarioId: string;
  priority: Priority;
  packages: string[];
  taskType: string;
  acceptanceCriteria: string[];
  expectedChangedPaths: string[];
  requiredChecks: string[];
  requiredArtifacts: string[];
  scoring: Record<string, number>;
}

export type BenchmarkTaskInput = Omit<BenchmarkTask, "priority"> & {
  priority: string;
};

export interface BenchmarkCatalog {
  version: number;
  tasks: BenchmarkTask[];
}

export interface TaskSnapshot {
  id: string;
  title: string;
  scenarioId: string;
  status: TaskStatus;
  priority: Priority;
  availableActions: string[];
  rollbackEligible: boolean;
}

const PRIORITY_ALIASES = new Map<string, Priority>([
  ["critical", "critical"],
  ["crit", "critical"],
  ["p0", "critical"],
  ["sev0", "critical"],
  ["severity0", "critical"],
  ["high", "high"],
  ["p1", "high"],
  ["sev1", "high"],
  ["severity1", "high"],
  ["medium", "medium"],
  ["med", "medium"],
  ["normal", "medium"],
  ["default", "medium"],
  ["sev2", "medium"],
  ["severity2", "medium"],
  ["low", "low"],
  ["p2", "low"],
  ["p3", "low"],
  ["sev3", "low"],
  ["severity3", "low"]
]);

export function normalizePriorityLabel(label: string): Priority {
  const normalized = PRIORITY_ALIASES.get(toPriorityAliasKey(label));
  if (!normalized) {
    throw new Error(`Unknown priority label: ${label}`);
  }
  return normalized;
}

export function validateBenchmarkTask(task: BenchmarkTaskInput): BenchmarkTask {
  return {
    ...task,
    priority: normalizePriorityLabel(task.priority)
  };
}

function toPriorityAliasKey(label: string): string {
  return label.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function validateScenarioDefinition(scenario: ScenarioDefinition) {
  if (scenario.kind === "seeded" && scenario.branch.includes("<")) {
    throw new Error(`Seeded scenario ${scenario.id} must use a fixed branch.`);
  }
  if (scenario.kind === "scratch" && !scenario.branch.startsWith("scratch/")) {
    throw new Error(`Scratch scenario ${scenario.id} must use scratch/* branches.`);
  }
  if (!scenario.live || typeof scenario.live !== "object") {
    throw new Error(`Scenario ${scenario.id} must define live metadata.`);
  }
  requireLiveString(scenario.id, "owner", scenario.live.owner);
  requireLiveString(scenario.id, "repo", scenario.live.repo);
  if (scenario.kind === "seeded") {
    requireLiveInteger(scenario.id, "issueNumber", scenario.live.issueNumber);
    requireLiveInteger(scenario.id, "pullNumber", scenario.live.pullNumber);
    requireLiveString(scenario.id, "headBranch", scenario.live.headBranch);
  } else {
    optionalLiveInteger(scenario.id, "issueNumber", scenario.live.issueNumber);
    optionalLiveInteger(scenario.id, "pullNumber", scenario.live.pullNumber);
    optionalLiveString(scenario.id, "headBranch", scenario.live.headBranch);
  }
  optionalLiveString(scenario.id, "expectedHeadSha", scenario.live.expectedHeadSha);
}

function requireLiveString(scenarioId: string, field: string, value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Scenario ${scenarioId} must define live.${field}.`);
  }
}

function optionalLiveString(scenarioId: string, field: string, value: unknown) {
  if (value !== undefined && (typeof value !== "string" || value.length === 0)) {
    throw new Error(`Scenario ${scenarioId} has invalid live.${field}.`);
  }
}

function requireLiveInteger(scenarioId: string, field: string, value: unknown) {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`Scenario ${scenarioId} must define live.${field}.`);
  }
}

function optionalLiveInteger(scenarioId: string, field: string, value: unknown) {
  if (value !== undefined && (!Number.isInteger(value) || Number(value) <= 0)) {
    throw new Error(`Scenario ${scenarioId} has invalid live.${field}.`);
  }
}

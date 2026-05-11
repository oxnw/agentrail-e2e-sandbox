import type { BenchmarkTask, CiStatus, ReviewOutcome, ScenarioDefinition, TaskSnapshot, TaskStatus } from "../../contracts/src/index.js";

export type GitHubIssueState = "open" | "closed";

export interface GitHubIssueLabel {
  id?: string;
  name: string;
  color?: string;
  description?: string | null;
}

export interface GitHubIssueAssignee {
  id?: string;
  login: string;
  name?: string | null;
  avatarUrl?: string;
  url?: string;
}

export interface GitHubIssueContext {
  number: number;
  title: string;
  state: GitHubIssueState;
  labels: GitHubIssueLabel[];
  assignees: GitHubIssueAssignee[];
  assignee?: GitHubIssueAssignee | null;
}

export type SparseGitHubIssueUpdate = Partial<GitHubIssueContext>;

export function mergeGitHubIssueUpdate(
  current: GitHubIssueContext,
  update: SparseGitHubIssueUpdate
): GitHubIssueContext {
  const merged = {
    ...current,
    ...update,
    labels: hasDefinedIssueField(update, "labels") ? update.labels : current.labels,
    assignees: hasDefinedIssueField(update, "assignees") ? update.assignees : current.assignees
  };

  if (hasDefinedIssueField(update, "assignee")) {
    merged.assignee = update.assignee;
  } else if ("assignee" in current) {
    merged.assignee = current.assignee;
  } else {
    delete merged.assignee;
  }

  return merged;
}

function hasDefinedIssueField<TKey extends keyof SparseGitHubIssueUpdate>(
  update: SparseGitHubIssueUpdate,
  key: TKey
): update is SparseGitHubIssueUpdate & Required<Pick<SparseGitHubIssueUpdate, TKey>> {
  return Object.prototype.hasOwnProperty.call(update, key) && update[key] !== undefined;
}

export function deriveReviewGate({
  ciStatus,
  reviewOutcome,
  allowShip = true
}: {
  ciStatus: CiStatus;
  reviewOutcome: ReviewOutcome;
  allowShip?: boolean;
}): { status: TaskStatus; availableActions: string[] } {
  if (ciStatus === "failed") {
    return { status: "todo", availableActions: ["submit", "view_ci_status"] };
  }

  if (reviewOutcome === "changes_requested") {
    return { status: "todo", availableActions: ["submit", "view_review_feedback"] };
  }

  if (ciStatus === "passed" && reviewOutcome === "approved") {
    return {
      status: "ready_to_ship",
      availableActions: allowShip ? ["view_ci_status", "ship"] : ["view_ci_status", "view_review_feedback"]
    };
  }

  return { status: "in_review", availableActions: ["refresh", "view_review_feedback"] };
}

export function buildTaskSnapshot({
  task,
  scenario
}: {
  task: BenchmarkTask;
  scenario: ScenarioDefinition | null;
}): TaskSnapshot {
  const reviewGate = deriveReviewGate({
    ciStatus: scenario?.expectedCiStatus ?? "variable",
    reviewOutcome: scenario?.expectedReviewOutcome ?? "variable",
    allowShip: scenario?.allowShip ?? false
  });

  return {
    id: task.id,
    title: task.title,
    scenarioId: task.scenarioId,
    status: reviewGate.status,
    priority: task.priority,
    availableActions: reviewGate.availableActions,
    rollbackEligible: Boolean(scenario?.allowRollback)
  };
}

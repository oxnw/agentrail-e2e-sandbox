import type { BenchmarkTask, CiStatus, ReviewOutcome, ScenarioDefinition, TaskSnapshot, TaskStatus } from "../../contracts/src/index.js";

export type GitHubIssueState = "open" | "closed";

export interface GitHubIssueLabel {
  id?: number;
  name: string;
  color?: string;
  description?: string | null;
}

export interface GitHubIssueAssignee {
  id?: number;
  login: string;
  avatarUrl?: string;
  htmlUrl?: string;
}

export interface GitHubIssueSnapshot {
  number: number;
  title: string;
  state: GitHubIssueState;
  labels: GitHubIssueLabel[];
  assignee: GitHubIssueAssignee | null;
  assignees: GitHubIssueAssignee[];
}

export type SparseGitHubIssueUpdate = Partial<GitHubIssueSnapshot>;

export function mergeGitHubIssueUpdate(
  current: GitHubIssueSnapshot,
  update: SparseGitHubIssueUpdate
): GitHubIssueSnapshot {
  return {
    ...current,
    ...update,
    labels: update.labels ?? current.labels,
    assignee: update.assignee === undefined ? current.assignee : update.assignee,
    assignees: update.assignees ?? current.assignees
  };
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

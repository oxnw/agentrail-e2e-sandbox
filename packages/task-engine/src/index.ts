import type { BenchmarkTask, CiStatus, ReviewOutcome, ScenarioDefinition, TaskSnapshot, TaskStatus } from "../../contracts/src/index.js";

export type GitHubIssueState = "open" | "closed";

export interface GitHubIssueLabel {
  id?: number;
  name: string;
  color?: string;
  description?: string | null;
  [metadata: string]: unknown;
}

export interface GitHubIssueAssignee {
  id?: number;
  login: string;
  [metadata: string]: unknown;
}

export interface GitHubIssueSnapshot {
  id?: number;
  number?: number;
  title?: string;
  state?: GitHubIssueState;
  labels?: GitHubIssueLabel[];
  assignee?: GitHubIssueAssignee | null;
  assignees?: GitHubIssueAssignee[];
  [metadata: string]: unknown;
}

export type SparseGitHubIssueUpdate = Partial<GitHubIssueSnapshot>;

export function ingestIssueUpdate<TIssue extends GitHubIssueSnapshot>(
  existingIssue: TIssue,
  update: SparseGitHubIssueUpdate
): TIssue & SparseGitHubIssueUpdate {
  const nextIssue = {
    ...existingIssue,
    ...update
  };

  if (update.labels === undefined) {
    nextIssue.labels = existingIssue.labels;
  }
  if (update.assignee === undefined) {
    nextIssue.assignee = existingIssue.assignee;
  }
  if (update.assignees === undefined) {
    nextIssue.assignees = existingIssue.assignees;
  }

  return nextIssue;
}

export const mergeIssueUpdate = ingestIssueUpdate;

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

import type { BenchmarkTask, CiStatus, ReviewOutcome, ScenarioDefinition, TaskSnapshot, TaskStatus } from "../../contracts/src/index.js";

export type IssueState = "open" | "closed";

export interface IssueLabel {
  id?: number;
  name: string;
  color?: string;
  description?: string | null;
}

export interface IssueAssignee {
  id?: number;
  login: string;
  name?: string | null;
  htmlUrl?: string;
  avatarUrl?: string;
}

export interface IssueSnapshot {
  number: number;
  title: string;
  state: IssueState;
  labels: IssueLabel[];
  assignee: IssueAssignee | null;
  updatedAt: string;
  closedAt?: string | null;
}

export type SparseIssueUpdate = Partial<IssueSnapshot>;

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

export function mergeIssueUpdate(existing: IssueSnapshot, update: SparseIssueUpdate): IssueSnapshot {
  return {
    ...existing,
    ...update,
    labels: hasOwn(update, "labels") ? update.labels ?? [] : existing.labels,
    assignee: hasOwn(update, "assignee") ? update.assignee ?? null : existing.assignee
  };
}

function hasOwn<T extends object>(value: T, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

import type { BenchmarkTask, CiStatus, ReviewOutcome, ScenarioDefinition, TaskSnapshot, TaskStatus } from "../../contracts/src/index.js";

export type IssueState = "open" | "closed";

export interface IssueLabel {
  id?: number;
  name: string;
  [key: string]: unknown;
}

export interface IssueAssignee {
  id?: number;
  login: string;
  [key: string]: unknown;
}

export interface IssueSnapshot {
  number: number;
  title: string;
  state: IssueState;
  labels: IssueLabel[];
  assignee?: IssueAssignee | null;
  assignees?: IssueAssignee[];
}

export type SparseIssueUpdate<TIssue extends IssueSnapshot = IssueSnapshot> = Partial<TIssue>;

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

export function mergeIssueUpdate<TIssue extends IssueSnapshot>(
  current: TIssue,
  update: SparseIssueUpdate<TIssue>
): TIssue {
  const merged = { ...current, ...update };

  if (!hasOwn(update, "labels")) {
    merged.labels = current.labels;
  }
  if (!hasOwn(update, "assignee") && hasOwn(current, "assignee")) {
    merged.assignee = current.assignee;
  }
  if (!hasOwn(update, "assignees") && hasOwn(current, "assignees")) {
    merged.assignees = current.assignees;
  }

  return merged as TIssue;
}

export function ingestIssueUpdate<TIssue extends IssueSnapshot>(
  current: TIssue,
  update: SparseIssueUpdate<TIssue>
): TIssue {
  return mergeIssueUpdate(current, update);
}

function hasOwn<T extends object, K extends PropertyKey>(
  value: T,
  key: K
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

import type {
  BenchmarkTask,
  CiStatus,
  Priority,
  ReviewOutcome,
  ScenarioDefinition,
  TaskSnapshot,
  TaskStatus,
  TaskSummary
} from "../../contracts/src/index.js";

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
    taskType: task.taskType,
    status: reviewGate.status,
    priority: task.priority,
    availableActions: reviewGate.availableActions,
    rollbackEligible: Boolean(scenario?.allowRollback)
  };
}

export function summarizeTaskSnapshots(snapshots: TaskSnapshot[]): TaskSummary {
  const byStatus: Record<TaskStatus, number> = {
    todo: 0,
    in_review: 0,
    ready_to_ship: 0
  };
  const byPriority: Record<Priority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  const byTaskType: Record<string, number> = {};

  for (const snapshot of snapshots) {
    byStatus[snapshot.status] += 1;
    byPriority[snapshot.priority] += 1;
    byTaskType[snapshot.taskType] = (byTaskType[snapshot.taskType] ?? 0) + 1;
  }

  return {
    total: snapshots.length,
    byStatus,
    byPriority,
    byTaskType
  };
}

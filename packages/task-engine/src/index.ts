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
    status: reviewGate.status,
    priority: task.priority,
    taskType: task.taskType,
    availableActions: reviewGate.availableActions,
    rollbackEligible: Boolean(scenario?.allowRollback)
  };
}

export function buildTaskSummary(snapshots: TaskSnapshot[]): TaskSummary {
  const summary: TaskSummary = {
    total: snapshots.length,
    byStatus: zeroedCounts<TaskStatus>(["todo", "in_review", "ready_to_ship"]),
    byPriority: zeroedCounts<Priority>(["critical", "high", "medium", "low"]),
    byTaskType: {}
  };

  for (const snapshot of snapshots) {
    summary.byStatus[snapshot.status] += 1;
    summary.byPriority[snapshot.priority] += 1;
    summary.byTaskType[snapshot.taskType] = (summary.byTaskType[snapshot.taskType] ?? 0) + 1;
  }

  return summary;
}

function zeroedCounts<T extends string>(keys: T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

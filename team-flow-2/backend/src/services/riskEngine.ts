export function calculateRisk(task: any): number {
  if (!task.dueDate || task.status === "DONE") return 0;
  const now = new Date();
  const due = new Date(task.dueDate);
  const totalDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (totalDays <= 0) return 100;
  const workLeft = task.estimatedHours ? Math.max(0, task.estimatedHours - (task.actualHours || 0)) : 1;
  const workRatio = workLeft / (task.estimatedHours || 1);
  const timeRatio = Math.min(1, 1 / totalDays);
  const baseScore = (workRatio * 0.6 + timeRatio * 0.4) * 100;
  const urgencyBonus = totalDays <= 1 ? 20 : totalDays <= 3 ? 10 : 0;
  const completionBonus = task.status === "IN_PROGRESS" ? -5 : task.status === "REVIEW" ? -15 : 0;
  return Math.min(100, Math.max(0, Math.round(baseScore + urgencyBonus + completionBonus)));
}

import { prisma } from "../db/index";

export async function generateStandupSummary(departmentId: string) {
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const tasks = await prisma.task.findMany({ where: { projectId: { in: (await prisma.project.findMany({ where: { departmentId } })).map((p: any) => p.id) } } });
  const recent = tasks.filter((t: any) => t.updatedAt >= dayAgo);
  const enriched = await Promise.all(recent.map(async (t: any) => {
    let assignee = null, project = null;
    if (t.assigneeId) {
      const u = await prisma.user.findUnique({ id: t.assigneeId });
      if (u) assignee = { name: u.name };
    }
    const p = await prisma.project.findUnique({ id: t.projectId });
    if (p) project = { name: p.name };
    return { ...t, assignee, project };
  }));

  return {
    date: new Date().toISOString().split("T")[0],
    summary: {
      completed: enriched.filter((t: any) => t.status === "DONE").map((t: any) => ({ task: t.title, by: t.assignee?.name, project: t.project?.name })),
      inProgress: enriched.filter((t: any) => t.status === "IN_PROGRESS").map((t: any) => ({ task: t.title, by: t.assignee?.name, project: t.project?.name })),
      inReview: enriched.filter((t: any) => t.status === "REVIEW").map((t: any) => ({ task: t.title, by: t.assignee?.name, project: t.project?.name })),
      pending: enriched.filter((t: any) => t.status === "TODO").map((t: any) => ({ task: t.title, assignee: t.assignee?.name, project: t.project?.name })),
    },
    metrics: {
      tasksCompleted: enriched.filter((t: any) => t.status === "DONE").length,
      tasksInProgress: enriched.filter((t: any) => t.status === "IN_PROGRESS").length,
      tasksInReview: enriched.filter((t: any) => t.status === "REVIEW").length,
      tasksPending: enriched.filter((t: any) => t.status === "TODO").length,
      totalUpdated: enriched.length,
    },
  };
}

export async function generateInsight(userId: string) {
  const tasks = await prisma.task.findMany({ where: { assigneeId: userId, status: { not: "DONE" } } });
  const overdueTasks = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date());
  const highPriorityOverdue = overdueTasks.filter((t: any) => t.priority === "HIGH" || t.priority === "CRITICAL");
  const highRiskTasks = tasks.filter((t: any) => t.riskLevel === "HIGH");
  const insights: string[] = [];
  if (highPriorityOverdue.length > 0) insights.push(`You have ${highPriorityOverdue.length} overdue high-priority task(s). Consider reassigning or reprioritizing.`);
  if (highRiskTasks.length > 0) insights.push(`${highRiskTasks.length} task(s) have a high risk of missing their deadline. Review and adjust timelines.`);
  if (tasks.length > 10 && overdueTasks.length === 0) insights.push("Great job! No overdue tasks. Keep up the momentum.");
  if (insights.length === 0) insights.push("All tasks are on track. Focus on completing your current work items.");
  return { date: new Date().toISOString().split("T")[0], insights };
}

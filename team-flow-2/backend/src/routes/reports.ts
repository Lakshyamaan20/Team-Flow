import { Router, Response } from "express";
import { prisma } from "../db/index";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/productivity/:userId", async (req: AuthRequest, res: Response) => {
  let tasks;
  if (req.user!.role === "MANAGER") {
    const managedProjects = await prisma.project.findMany({ where: { createdBy: req.user!.id } });
    const projectIds = managedProjects.map((p: any) => p.id);
    tasks = projectIds.length > 0
      ? await prisma.task.findMany({ where: { projectId: { in: projectIds } }, orderBy: { createdAt: "desc" } })
      : [];
  } else {
    tasks = await prisma.task.findMany({ where: { assigneeId: req.params.userId }, orderBy: { createdAt: "desc" } });
  }
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === "DONE").length;
  const onTimeTasks = tasks.filter((t: any) => t.status === "DONE" && t.dueDate && new Date(t.updatedAt) <= new Date(t.dueDate)).length;
  const onTimePercent = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const weeklyTasks = tasks.filter((t: any) => t.updatedAt >= weekAgo);
  const weeklyCompleted = weeklyTasks.filter((t: any) => t.status === "DONE").length;

  res.json({
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    onTimePercent,
    weeklyVelocity: weeklyCompleted,
    averageCompletionHours: calcAvgCompletion(tasks),
    tasksByStatus: {
      TODO: tasks.filter((t: any) => t.status === "TODO").length,
      IN_PROGRESS: tasks.filter((t: any) => t.status === "IN_PROGRESS").length,
      REVIEW: tasks.filter((t: any) => t.status === "REVIEW").length,
      PENDING_APPROVAL: tasks.filter((t: any) => t.status === "PENDING_APPROVAL").length,
      DONE: tasks.filter((t: any) => t.status === "DONE").length,
    },
  });
});

router.get("/overview", async (req: AuthRequest, res: Response) => {
  let tasks;
  if (req.user!.role === "MANAGER") {
    const managedProjects = await prisma.project.findMany({ where: { createdBy: req.user!.id } });
    const projectIds = managedProjects.map((p: any) => p.id);
    tasks = projectIds.length > 0
      ? await prisma.task.findMany({ where: { projectId: { in: projectIds } } })
      : [];
  } else if (req.user!.role === "MEMBER") {
    tasks = await prisma.task.findMany({ where: { assigneeId: req.user!.id } });
  } else {
    tasks = await prisma.task.findMany({});
  }
  const now = new Date();
  const doneTasks = tasks.filter((t: any) => t.status === "DONE");
  const onTimeTasks = doneTasks.filter((t: any) => t.dueDate && new Date(t.updatedAt) <= new Date(t.dueDate));
  const onTimePercent = doneTasks.length > 0 ? Math.round((onTimeTasks.length / doneTasks.length) * 100) : 0;
  res.json({
    totalTasks: tasks.length,
    completedTasks: doneTasks.length,
    pendingTasks: tasks.filter((t: any) => t.status !== "DONE").length,
    overdueTasks: tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE").length,
    onTimePercent,
    tasksByStatus: {
      TODO: tasks.filter((t: any) => t.status === "TODO").length,
      IN_PROGRESS: tasks.filter((t: any) => t.status === "IN_PROGRESS").length,
      REVIEW: tasks.filter((t: any) => t.status === "REVIEW").length,
      PENDING_APPROVAL: tasks.filter((t: any) => t.status === "PENDING_APPROVAL").length,
      DONE: tasks.filter((t: any) => t.status === "DONE").length,
    },
  });
});

router.get("/week-in-review", async (req: AuthRequest, res: Response) => {
  const now = Date.now();
  const weekStart = new Date(now - 7 * 86400000);
  const prevWeekStart = new Date(now - 14 * 86400000);

  let tasks;
  if (req.user!.role === "MANAGER") {
    const managedProjects = await prisma.project.findMany({ where: { createdBy: req.user!.id } });
    const projectIds = managedProjects.map((p: any) => p.id);
    tasks = projectIds.length > 0 ? await prisma.task.findMany({ where: { projectId: { in: projectIds } } }) : [];
  } else if (req.user!.role === "MEMBER") {
    tasks = await prisma.task.findMany({ where: { assigneeId: req.user!.id } });
  } else {
    tasks = await prisma.task.findMany({});
  }

  const thisWeek = tasks.filter((t: any) => new Date(t.createdAt) >= weekStart);
  const prevWeek = tasks.filter((t: any) => {
    const c = new Date(t.createdAt);
    return c >= prevWeekStart && c < weekStart;
  });
  const thisWeekDone = tasks.filter((t: any) => t.status === "DONE" && new Date(t.updatedAt) >= weekStart);
  const prevWeekDone = tasks.filter((t: any) => t.status === "DONE") .filter((t: any) => {
    const u = new Date(t.updatedAt);
    return u >= prevWeekStart && u < weekStart;
  });
  const nowDate = new Date();
  const overdue = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < nowDate && t.status !== "DONE").length;
  const prevOverdue = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date(prevWeekStart.getTime()) && t.status !== "DONE").length;

  const createdNow = thisWeek.length;
  const createdPrev = prevWeek.length;
  const doneNow = thisWeekDone.length;
  const donePrev = prevWeekDone.length;

  res.json({
    createdThisWeek: createdNow,
    createdLastWeek: createdPrev,
    completedThisWeek: doneNow,
    completedLastWeek: donePrev,
    overdue,
    overdueTrend: overdue > prevOverdue ? "up" : overdue < prevOverdue ? "down" : "flat",
    createdTrend: createdNow > createdPrev ? "up" : createdNow < createdPrev ? "down" : "flat",
    completedTrend: doneNow > donePrev ? "up" : doneNow < donePrev ? "down" : "flat",
  });
});

router.get("/team/:departmentId", authorize("ADMIN", "MANAGER"), async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({ where: { departmentId: req.params.departmentId } });
  const report = await Promise.all(users.map(async (u: any) => {
    const tasks = await prisma.task.findMany({ where: { assigneeId: u.id } });
    return {
      userId: u.id, name: u.name,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t: any) => t.status === "DONE").length,
      pendingTasks: tasks.filter((t: any) => t.status !== "DONE").length,
    };
  }));
  res.json(report);
});

function calcAvgCompletion(tasks: any[]): number {
  const completed = tasks.filter((t: any) => t.status === "DONE" && t.estimatedHours && t.actualHours);
  if (!completed.length) return 0;
  const ratios = completed.map((t: any) => t.actualHours / t.estimatedHours);
  return Math.round((ratios.reduce((a: number, b: number) => a + b, 0) / ratios.length) * 100) / 100;
}

export default router;

import { Router, Response } from "express";
import { prisma } from "../db/index";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { calculateRisk } from "../services/riskEngine";

const router = Router();
router.use(authenticate);

router.get("/my", async (req: AuthRequest, res: Response) => {
  let tasks;
  if (req.user!.role === "MANAGER") {
    const managedProjects = await prisma.project.findMany({ where: { createdBy: req.user!.id } });
    const projectIds = managedProjects.map((p: any) => p.id);
    const projectTasks = projectIds.length > 0
      ? await prisma.task.findMany({ where: { projectId: { in: projectIds } }, orderBy: { createdAt: "desc" } })
      : [];
    const personalTasks = await prisma.task.findMany({ where: { assigneeId: req.user!.id }, orderBy: { createdAt: "desc" } });
    const seen = new Set(projectTasks.map((t: any) => t.id));
    tasks = [...projectTasks, ...personalTasks.filter((t: any) => !seen.has(t.id))];
  } else if (req.user!.role === "ADMIN") {
    tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  } else {
    tasks = await prisma.task.findMany({ where: { assigneeId: req.user!.id }, orderBy: { createdAt: "desc" } });
  }
  const enriched = await Promise.all(tasks.map(async (t: any) => {
    let project = null, assignee = null;
    if (t.projectId) {
      const p = await prisma.project.findUnique({ id: t.projectId });
      if (p) {
        let manager = null;
        if (p.createdBy) {
          const m = await prisma.user.findUnique({ id: p.createdBy });
          if (m) manager = { id: m.id, name: m.name, email: m.email, avatar: m.avatar };
        }
        project = { ...p, manager };
      }
    }
    if (t.assigneeId) {
      const u = await prisma.user.findUnique({ id: t.assigneeId });
      if (u) assignee = { id: u.id, name: u.name, avatar: u.avatar };
    }
    return { ...t, project, assignee };
  }));
  res.json(enriched);
});

router.get("/all", async (req: AuthRequest, res: Response) => {
  let tasks = await prisma.task.findMany({ orderBy: { dueDate: "asc" } });
  if (req.user!.role === "MEMBER") {
    tasks = tasks.filter((t: any) => t.assigneeId === req.user!.id);
  } else if (req.user!.role === "MANAGER" && req.user!.departmentId) {
    const deptProjects = await prisma.project.findMany({ where: { departmentId: req.user!.departmentId } });
    const deptProjectIds = new Set(deptProjects.map((p: any) => p.id));
    tasks = tasks.filter((t: any) => deptProjectIds.has(t.projectId));
  }
  const enriched = await Promise.all(tasks.map(async (t: any) => {
    let project = null, assignee = null;
    if (t.projectId) project = await prisma.project.findUnique({ id: t.projectId });
    if (t.assigneeId) {
      const u = await prisma.user.findUnique({ id: t.assigneeId });
      if (u) assignee = { id: u.id, name: u.name, avatar: u.avatar };
    }
    return { ...t, project, assignee };
  }));
  res.json(enriched);
});

router.get("/project/:projectId", async (req: AuthRequest, res: Response) => {
  const tasks = await prisma.task.findMany({ where: { projectId: req.params.projectId }, orderBy: { sortOrder: "asc" } });
  const enriched = await Promise.all(tasks.map(async (t: any) => {
    let assignee = null;
    if (t.assigneeId) {
      const u = await prisma.user.findUnique({ id: t.assigneeId });
      if (u) assignee = { id: u.id, name: u.name, avatar: u.avatar };
    }
    const comments = await prisma.comment.findMany({ where: { taskId: t.id } });
    const commentsWithUsers = await Promise.all(comments.map(async (c: any) => {
      const u = await prisma.user.findUnique({ id: c.userId });
      return { ...c, user: u ? { id: u.id, name: u.name, avatar: u.avatar } : null };
    }));
    const logs = await prisma.activityLog.findMany({ where: { taskId: t.id }, orderBy: { createdAt: "desc" } });
    const logsWithUsers = await Promise.all(logs.map(async (l: any) => {
      const u = await prisma.user.findUnique({ id: l.userId });
      return { ...l, user: u ? { id: u.id, name: u.name } : null };
    }));
    return { ...t, assignee, comments: commentsWithUsers, activityLogs: logsWithUsers };
  }));
  res.json(enriched);
});

router.post("/", authorize("ADMIN", "MANAGER", "TEAM_LEAD"), async (req: AuthRequest, res: Response) => {
  const { comment: commentText, ...taskData } = req.body;
  const task = await prisma.task.create({ ...taskData, createdById: req.user!.id });
  if (commentText) {
    await prisma.comment.create({ content: commentText, taskId: task.id, userId: req.user!.id });
  }
  if (task.assigneeId) {
    await prisma.notification.create({
      userId: task.assigneeId,
      title: "New Task Assigned",
      message: `You have been assigned: "${task.title}"`,
      type: "TASK_ASSIGNED",
    });
  }
  req.io?.emit("task:created", task);
  res.status(201).json(task);
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const existing = await prisma.task.findUnique({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Task not found" });
  const data = { ...req.body };
  if (data.status && data.status !== existing.status) {
    if (data.status === "DONE" && req.user!.role === "MEMBER") {
      data.status = "PENDING_APPROVAL";
    }
    if ((existing.status === "PENDING_APPROVAL" || data.status === "PENDING_APPROVAL") && !["ADMIN", "MANAGER"].includes(req.user!.role)) {
      return res.status(403).json({ error: "Only managers can approve or reject tasks" });
    }
    await prisma.activityLog.create({
      action: data.status === "DONE" && existing.status === "PENDING_APPROVAL" ? "task_approved" : data.status === "IN_PROGRESS" && existing.status === "PENDING_APPROVAL" ? "task_rejected" : "status_change",
      details: `${existing.status} → ${data.status}`,
      taskId: req.params.id,
      userId: req.user!.id,
    });
    if (data.status === "PENDING_APPROVAL") {
      const project = existing.projectId ? await prisma.project.findUnique({ id: existing.projectId }) : null;
      if (project?.createdBy) {
        const assignee = await prisma.user.findUnique({ id: existing.assigneeId || "" });
        await prisma.notification.create({
          userId: project.createdBy,
          title: "Task Pending Approval",
          message: `"${existing.title}" submitted for approval by ${assignee?.name || "Unknown"}`,
          type: "TASK_PENDING_APPROVAL",
        });
      }
    } else if (existing.status === "PENDING_APPROVAL" && (data.status === "DONE" || data.status === "IN_PROGRESS" || data.status === "REVIEW")) {
      if (existing.assigneeId) {
        const reviewer = await prisma.user.findUnique({ id: req.user!.id });
        await prisma.notification.create({
          userId: existing.assigneeId,
          title: data.status === "DONE" ? "Task Approved" : "Task Returned for Rework",
          message: data.status === "DONE" ? `"${existing.title}" was approved by ${reviewer?.name || "Manager"}` : `"${existing.title}" was returned to ${data.status} by ${reviewer?.name || "Manager"}`,
          type: data.status === "DONE" ? "TASK_APPROVED" : "TASK_REJECTED",
        });
      }
    }
  }
  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    await prisma.notification.create({
      userId: data.assigneeId,
      title: "Task Assigned to You",
      message: `You have been assigned: "${existing.title}"`,
      type: "TASK_ASSIGNED",
    });
  }
  if (existing.dueDate) {
    data.riskScore = calculateRisk(existing);
    data.riskLevel = data.riskScore > 60 ? "HIGH" : data.riskScore > 30 ? "MEDIUM" : "LOW";
  }
  const task = await prisma.task.update({ id: req.params.id }, data);
  req.io?.emit("task:updated", task);
  res.json(task);
});

router.patch("/:id/status", async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const existing = await prisma.task.findUnique({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Task not found" });
  let newStatus = status;
  if (status === "DONE" && req.user!.role === "MEMBER") {
    newStatus = "PENDING_APPROVAL";
  }
  if ((existing.status === "PENDING_APPROVAL" || newStatus === "PENDING_APPROVAL") && !["ADMIN", "MANAGER"].includes(req.user!.role)) {
    return res.status(403).json({ error: "Only managers can approve or reject tasks" });
  }
  await prisma.activityLog.create({
    action: newStatus === "DONE" && existing.status === "PENDING_APPROVAL" ? "task_approved" : newStatus === "IN_PROGRESS" && existing.status === "PENDING_APPROVAL" ? "task_rejected" : "status_change",
    details: `${existing.status} → ${newStatus}`,
    taskId: req.params.id,
    userId: req.user!.id,
  });
  const task = await prisma.task.update({ id: req.params.id }, { status: newStatus });
  if (newStatus === "PENDING_APPROVAL" && existing.status !== "PENDING_APPROVAL") {
    const project = existing.projectId ? await prisma.project.findUnique({ id: existing.projectId }) : null;
    if (project?.createdBy) {
      const assignee = await prisma.user.findUnique({ id: existing.assigneeId || "" });
      await prisma.notification.create({
        userId: project.createdBy,
        title: "Task Pending Approval",
        message: `"${existing.title}" submitted for approval by ${assignee?.name || "Unknown"}`,
        type: "TASK_PENDING_APPROVAL",
      });
    }
  } else if (existing.status === "PENDING_APPROVAL" && (newStatus === "DONE" || newStatus === "IN_PROGRESS" || newStatus === "REVIEW")) {
    if (existing.assigneeId) {
      const reviewer = await prisma.user.findUnique({ id: req.user!.id });
      await prisma.notification.create({
        userId: existing.assigneeId,
        title: newStatus === "DONE" ? "Task Approved" : "Task Returned for Rework",
        message: newStatus === "DONE" ? `"${existing.title}" was approved by ${reviewer?.name || "Manager"}` : `"${existing.title}" was returned to ${newStatus} by ${reviewer?.name || "Manager"}`,
        type: newStatus === "DONE" ? "TASK_APPROVED" : "TASK_REJECTED",
      });
    }
  }
  req.io?.emit("task:statusChanged", task);
  res.json(task);
});

router.post("/predict-deadline", async (req: AuthRequest, res: Response) => {
  const { estimatedHours, priority } = req.body;
  const priorityHours: Record<string, number> = { CRITICAL: 16, HIGH: 24, MEDIUM: 40, LOW: 56 };
  const hrs = estimatedHours && estimatedHours >= 1 ? estimatedHours : (priorityHours[priority] || 24);
  const priorityMultipliers: Record<string, number> = { CRITICAL: 0.6, HIGH: 0.75, MEDIUM: 1.0, LOW: 1.3 };
  const multiplier = priorityMultipliers[priority] || 1.0;
  const rawDays = (hrs / 6) * multiplier;
  const predictedDays = Math.max(1, Math.round(rawDays));
  const predictedDate = new Date(Date.now() + predictedDays * 86400000);
  let confidence = "MEDIUM";
  if (predictedDays <= 5) confidence = "HIGH";
  else if (predictedDays > 14) confidence = "LOW";
  res.json({
    predictedDays,
    predictedDate: predictedDate.toISOString(),
    confidence,
    breakdown: {
      estimatedHours: hrs,
      priority,
      multiplier,
      workHoursPerDay: 6,
    },
  });
});

router.put("/:id/review", authorize("ADMIN", "MANAGER"), async (req: AuthRequest, res: Response) => {
  const { score, comment } = req.body;
  if (score === undefined || score < 1 || score > 10) {
    return res.status(400).json({ error: "Score must be between 1 and 10" });
  }
  const existing = await prisma.task.findUnique({ id: req.params.id });
  if (!existing) return res.status(404).json({ error: "Task not found" });
  const task = await prisma.task.update({ id: req.params.id }, { reviewScore: score, reviewComment: comment || null });
  const reviewer = await prisma.user.findUnique({ id: req.user!.id });
  await prisma.activityLog.create({
    action: "task_reviewed",
    details: `Task reviewed by ${reviewer?.name || "Unknown"}: scored ${score}/10${comment ? ` — "${comment}"` : ""}`,
    taskId: req.params.id,
    userId: req.user!.id,
  });
  req.io?.emit("task:updated", task);
  res.json(task);
});

router.delete("/:id", authorize("ADMIN", "MANAGER"), async (req: AuthRequest, res: Response) => {
  await prisma.comment.deleteMany({ taskId: req.params.id });
  await prisma.activityLog.deleteMany({ taskId: req.params.id });
  await prisma.task.delete({ id: req.params.id });
  req.io?.emit("task:deleted", req.params.id);
  res.json({ message: "Task deleted" });
});

router.post("/bulk", authorize("ADMIN", "MANAGER"), async (req: AuthRequest, res: Response) => {
  const { taskIds, action, value } = req.body;
  if (!taskIds?.length) return res.status(400).json({ error: "taskIds required" });

  if (action === "delete") {
    for (const id of taskIds) {
      await prisma.comment.deleteMany({ taskId: id });
      await prisma.activityLog.deleteMany({ taskId: id });
      await prisma.task.delete({ id });
    }
    return res.json({ success: true, count: taskIds.length, action: "deleted" });
  }

  if (action === "status") {
    for (const id of taskIds) {
      const existing = await prisma.task.findUnique({ id });
      if (!existing) continue;
      await prisma.activityLog.create({
        action: "status_change",
        details: `${existing.status} → ${value}`,
        taskId: id,
        userId: req.user!.id,
      });
      await prisma.task.update({ id }, { status: value });
    }
    return res.json({ success: true, count: taskIds.length, action: "status_updated" });
  }

  if (action === "assign") {
    for (const id of taskIds) {
      const existing = await prisma.task.findUnique({ id });
      if (!existing) continue;
      await prisma.task.update({ id }, { assigneeId: value });
      if (value) {
        await prisma.notification.create({
          userId: value,
          title: "Task Assigned to You",
          message: `You have been assigned: "${existing.title}"`,
          type: "TASK_ASSIGNED",
        });
      }
    }
    return res.json({ success: true, count: taskIds.length, action: "assigned" });
  }

  if (action === "priority") {
    for (const id of taskIds) {
      await prisma.task.update({ id }, { priority: value });
    }
    return res.json({ success: true, count: taskIds.length, action: "priority_updated" });
  }

  res.status(400).json({ error: "Invalid action" });
});

export default router;

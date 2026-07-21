import { Router, Response } from "express";
import { prisma } from "../db/index";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  let projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
  if (req.user!.role === "MEMBER") {
    const taskIds = (await prisma.task.findMany({ where: { assigneeId: req.user!.id } })).map((t: any) => t.projectId);
    projects = projects.filter((p: any) => taskIds.includes(p.id));
  } else if (req.user!.role === "MANAGER") {
    projects = projects.filter((p: any) => p.createdBy === req.user!.id);
  } else if (req.user!.role === "TEAM_LEAD") {
    projects = projects.filter((p: any) => p.createdBy === req.user!.id);
  }
  const result = await Promise.all(projects.map(async (p: any) => {
    const allProjectTasks = await prisma.task.findMany({ where: { projectId: p.id }, select: { status: true } });
    const taskCount = allProjectTasks.length;
    const doneCount = allProjectTasks.filter((t: any) => t.status === "DONE").length;
    const completionPercent = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
    let dept = null;
    if (p.departmentId) dept = await prisma.department.findUnique({ id: p.departmentId });
    let manager = null;
    if (p.createdBy) {
      const u = await prisma.user.findUnique({ id: p.createdBy });
      if (u) manager = { id: u.id, name: u.name, avatar: u.avatar };
    }
    return { ...p, _count: { tasks: taskCount }, completionPercent, department: dept, manager };
  }));
  res.json(result);
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findUnique({ id: req.params.id });
  if (!project) return res.status(404).json({ error: "Project not found" });
  const tasks = await prisma.task.findMany({ where: { projectId: project.id }, orderBy: { sortOrder: "asc" } });
  const tasksWithAssignees = await Promise.all(tasks.map(async (t: any) => {
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
    return { ...t, assignee, comments: commentsWithUsers };
  }));
  const detailTasks = await prisma.task.findMany({ where: { projectId: project.id }, select: { status: true } });
  const taskCount = detailTasks.length;
  const doneCount = detailTasks.filter((t: any) => t.status === "DONE").length;
  const completionPercent = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
  let dept = null;
  if (project.departmentId) dept = await prisma.department.findUnique({ id: project.departmentId });
  let manager = null;
  if (project.createdBy) {
    const u = await prisma.user.findUnique({ id: project.createdBy });
    if (u) manager = { id: u.id, name: u.name, avatar: u.avatar };
  }
  res.json({ ...project, _count: { tasks: taskCount }, completionPercent, department: dept, tasks: tasksWithAssignees, manager });
});

router.post("/", authorize("ADMIN", "MANAGER"), async (req: AuthRequest, res: Response) => {
  const data = { ...req.body };
  if (req.user!.role === "ADMIN" && data.createdBy) {
    data.createdBy = data.createdBy;
  } else {
    data.createdBy = req.user!.id;
  }
  const project = await prisma.project.create(data);
  res.status(201).json(project);
});

router.put("/:id", authorize("ADMIN", "MANAGER"), async (req: AuthRequest, res: Response) => {
  const updateData = { ...req.body };
  delete updateData.id;
  const project = await prisma.project.update({ id: req.params.id }, updateData);
  res.json(project);
});

router.delete("/:id", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  await prisma.task.deleteMany({ projectId: req.params.id });
  await prisma.project.delete({ id: req.params.id });
  res.json({ message: "Project deleted" });
});

export default router;

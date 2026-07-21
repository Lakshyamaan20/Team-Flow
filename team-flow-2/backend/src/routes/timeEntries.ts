import { Router, Response } from "express";
import { prisma } from "../db/index";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/task/:taskId", async (req: AuthRequest, res: Response) => {
  const entries = await prisma.timeEntry.findMany({ where: { taskId: req.params.taskId }, orderBy: { date: "desc" } });
  const enriched = await Promise.all(entries.map(async (e: any) => {
    const u = await prisma.user.findUnique({ id: e.userId });
    return { ...e, user: u ? { id: u.id, name: u.name } : null };
  }));
  res.json(enriched);
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { taskId, hours, date: entryDate, description } = req.body;
  if (!taskId || !hours) return res.status(400).json({ error: "taskId and hours are required" });
  const task = await prisma.task.findUnique({ id: taskId });
  if (!task) return res.status(404).json({ error: "Task not found" });
  const date = entryDate || new Date().toISOString().split("T")[0];
  const entry = await prisma.timeEntry.create({ taskId, userId: req.user!.id, date, hours: Number(hours), description: description || "" });
  const updatedActual = (task.actualHours || 0) + Number(hours);
  await prisma.task.update({ id: taskId }, { actualHours: updatedActual });
  res.status(201).json(entry);
});

router.get("/user/:userId", async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  let sql = "SELECT * FROM TimeEntry WHERE userId = ?";
  const params: any[] = [req.params.userId];
  if (startDate) { sql += " AND date >= ?"; params.push(startDate); }
  if (endDate) { sql += " AND date <= ?"; params.push(endDate); }
  sql += " ORDER BY date DESC";
  const entries = await prisma.$queryRaw(sql, params);
  const enriched = await Promise.all(entries.map(async (e: any) => {
    const t = await prisma.task.findUnique({ id: e.taskId });
    return { ...e, task: t ? { id: t.id, title: t.title } : null };
  }));
  res.json(enriched);
});

router.get("/team/:departmentId", async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const users = await prisma.user.findMany({ where: { departmentId: req.params.departmentId } });
  const result = await Promise.all(users.map(async (u: any) => {
    let sql = "SELECT * FROM TimeEntry WHERE userId = ?";
    const params: any[] = [u.id];
    if (startDate) { sql += " AND date >= ?"; params.push(startDate); }
    if (endDate) { sql += " AND date <= ?"; params.push(endDate); }
    const entries = await prisma.$queryRaw(sql, params);
    const totalHours = entries.reduce((s: number, e: any) => s + e.hours, 0);
    return { userId: u.id, name: u.name, totalHours, entryCount: entries.length, entries };
  }));
  res.json(result);
});

export default router;

import { Router, Response } from "express";
import { prisma } from "../db/index";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", authorize("ADMIN", "MANAGER", "MEMBER"), async (_req: AuthRequest, res: Response) => {
  const logs = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" } });
  const enriched = await Promise.all(logs.map(async (l: any) => {
    let user = null;
    if (l.userId) {
      const u = await prisma.user.findUnique({ id: l.userId });
      if (u) user = { id: u.id, name: u.name };
    }
    let task = null;
    if (l.taskId) {
      const t = await prisma.task.findUnique({ id: l.taskId });
      if (t) {
        let project = null;
        if (t.projectId) project = await prisma.project.findUnique({ id: t.projectId });
        task = { id: t.id, title: t.title, project: project ? { id: project.id, name: project.name } : null };
      }
    }
    return { ...l, user, task };
  }));
  res.json(enriched);
});

export default router;

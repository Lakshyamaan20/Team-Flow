import { Router, Response } from "express";
import { prisma } from "../db/index";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  const notifs = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" } });
  res.json(notifs);
});

router.get("/unread-count", async (req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({ userId: req.user!.id, read: 0 });
  res.json({ count });
});

router.put("/:id/read", async (req: AuthRequest, res: Response) => {
  await prisma.$executeRaw("UPDATE Notification SET read = 1 WHERE id = ? AND userId = ?", [req.params.id, req.user!.id]);
  res.json({ message: "Marked as read" });
});

router.put("/read-all", async (req: AuthRequest, res: Response) => {
  await prisma.$executeRaw("UPDATE Notification SET read = 1 WHERE userId = ? AND read = 0", [req.user!.id]);
  res.json({ message: "All marked as read" });
});

export default router;

import { Router, Response } from "express";
import { prisma } from "../db/index";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (_req: AuthRequest, res: Response) => {
  const departments = await prisma.department.findMany();
  res.json(departments);
});

router.get("/:id/users", async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({ where: { departmentId: req.params.id } });
  res.json(users);
});

export default router;

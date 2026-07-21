import { Router, Response } from "express";
import { prisma } from "../db/index";
import { authenticate, requirePermission, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

const ALL_PERMISSIONS = [
  "canViewDashboard", "canViewProjects", "canAssignTask", "canViewReports",
  "canViewTeam", "canViewAdmin", "canViewActivityLog", "canViewCalendar",
  "canViewMyTasks", "canReviewTask", "canManageUsers", "canDeleteProjects",
  "canManagePermissions",
];

router.get("/", requirePermission("canManagePermissions"), async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({});
  const result = users.map((u: any) => {
    let perms: Record<string, boolean> = {};
    try { perms = JSON.parse(u.permissions || "{}"); } catch {}
    return { id: u.id, name: u.name, email: u.email, role: u.role, hierarchyLevel: u.hierarchyLevel, permissions: perms };
  });
  res.json({ users: result, allPermissions: ALL_PERMISSIONS });
});

router.put("/:userId", requirePermission("canManagePermissions"), async (req: AuthRequest, res: Response) => {
  const { permissions, hierarchyLevel } = req.body;
  const data: any = {};
  if (permissions) data.permissions = JSON.stringify(permissions);
  if (hierarchyLevel) data.hierarchyLevel = hierarchyLevel;
  const user = await prisma.user.update({ id: req.params.userId }, data);
  res.json({ id: user.id, name: user.name, role: user.role, hierarchyLevel: user.hierarchyLevel });
});

export default router;

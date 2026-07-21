import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/index";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", authorize("ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"), async (req: AuthRequest, res: Response) => {
  let where: any = {};
  if (req.user!.role === "MEMBER" && req.user!.departmentId) {
    where = { departmentId: req.user!.departmentId };
  }
  const users = await prisma.user.findMany({ where, orderBy: { name: "asc" } });
  const enriched = await Promise.all(users.map(async (u: any) => {
    const { password, ...userData } = u;
    let dept = null;
    if (u.departmentId) dept = await prisma.department.findUnique({ id: u.departmentId });
    return { ...userData, department: dept };
  }));
  res.json(enriched);
});

router.get("/team/:departmentId", async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({ where: { departmentId: req.params.departmentId }, orderBy: { name: "asc" } });
  const enriched = await Promise.all(users.map(async (u: any) => {
    const { password, ...userData } = u;
    let dept = null;
    if (u.departmentId) dept = await prisma.department.findUnique({ id: u.departmentId });
    return { ...userData, department: dept };
  }));
  res.json(enriched);
});

router.put("/profile", async (req: AuthRequest, res: Response) => {
  const { name, email } = req.body;
  if (email) {
    const existing = await prisma.user.findUnique({ email });
    if (existing && existing.id !== req.user!.id) {
      return res.status(400).json({ error: "Email already in use" });
    }
  }
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  const user = await prisma.user.update({ id: req.user!.id }, data);
  const { password, ...userData } = user;
  res.json(userData);
});

router.put("/password", async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const user = await prisma.user.findUnique({ id: req.user!.id });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ id: req.user!.id }, { password: hashed });
  res.json({ message: "Password updated successfully" });
});

const DEFAULT_PERMS: Record<string, Record<string, boolean>> = {
  ADMIN: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: true, canViewTeam: true, canViewAdmin: true, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: true, canDeleteProjects: true, canManagePermissions: true },
  MANAGER: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: true, canViewTeam: true, canViewAdmin: false, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
  TEAM_LEAD: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: false, canViewTeam: true, canViewAdmin: false, canViewActivityLog: false, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
  MEMBER: { canViewDashboard: true, canViewProjects: true, canAssignTask: false, canViewReports: false, canViewTeam: true, canViewAdmin: false, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: false, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
};
const HIERARCHY: Record<string, number> = { ADMIN: 4, MANAGER: 3, TEAM_LEAD: 2, MEMBER: 1 };

router.put("/:id/role", authorize("ADMIN"), async (req: AuthRequest, res: Response) => {
  const role = req.body.role;
  const user = await prisma.user.update({ id: req.params.id }, {
    role, hierarchyLevel: HIERARCHY[role] || 1, permissions: JSON.stringify(DEFAULT_PERMS[role] || DEFAULT_PERMS.MEMBER),
  });
  const { password, ...userData } = user;
  res.json(userData);
});

export default router;

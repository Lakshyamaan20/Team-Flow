import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/index";
import { authenticate, AuthRequest } from "../middleware/auth";
import { findDataPortalUser, findDataPortalEmployee, mapPortalPermsToTeamFlow, deriveRole, deriveHierarchyLevel } from "../services/dataPortal";

const DEFAULT_PERMS: Record<string, Record<string, boolean>> = {
  ADMIN: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: true, canViewTeam: true, canViewAdmin: true, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: true, canDeleteProjects: true, canManagePermissions: true },
  MANAGER: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: true, canViewTeam: true, canViewAdmin: false, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
  TEAM_LEAD: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: false, canViewTeam: true, canViewAdmin: false, canViewActivityLog: false, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
  MEMBER: { canViewDashboard: true, canViewProjects: true, canAssignTask: false, canViewReports: false, canViewTeam: true, canViewAdmin: false, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: false, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
};
const HIERARCHY: Record<string, number> = { ADMIN: 4, MANAGER: 3, TEAM_LEAD: 2, MEMBER: 1 };

const PG_ENABLED = !!(process.env.PG_HOST && process.env.PG_USER);

const router = Router();

router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role, departmentId } = req.body;
    const existing = await prisma.user.findUnique({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });
    const hashed = await bcrypt.hash(password, 12);
    const r = role || "MEMBER";
    const user = await prisma.user.create({
      email, password: hashed, name, role: r, departmentId,
      hierarchyLevel: HIERARCHY[r] || 1, permissions: JSON.stringify(DEFAULT_PERMS[r] || DEFAULT_PERMS.MEMBER),
    });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "secret", { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    const { password: _, ...userData } = user;
    if (typeof userData.permissions === "string") { try { userData.permissions = JSON.parse(userData.permissions); } catch { userData.permissions = {}; } }
    res.status(201).json({ user: userData, token });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    const empId = email.split("@")[0].toUpperCase();

    let userData: any = null;

    if (PG_ENABLED) {
      try {
        const portalUser = await findDataPortalUser(empId);
        if (portalUser && !portalUser.isBlocked) {
          const portalEmp = await findDataPortalEmployee(empId);
          const role = portalEmp ? deriveRole(portalEmp.department, portalEmp.designation) : "MEMBER";
          const portalPerms = mapPortalPermsToTeamFlow(portalUser.portalPerms);
          userData = {
            id: `portal_${portalUser.empId}`,
            email: portalUser.email || email,
            name: portalUser.name,
            role,
            avatar: null,
            departmentId: null,
            hierarchyLevel: deriveHierarchyLevel(role),
            permissions: portalPerms,
            createdAt: new Date().toISOString(),
          };
        }
      } catch (pgErr) {
        console.error("PostgreSQL login fallback:", (pgErr as Error).message);
      }
    }

    if (!userData) {
      const user = await prisma.user.findUnique({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const { password: _, ...ud } = user;
      if (typeof ud.permissions === "string") { try { ud.permissions = JSON.parse(ud.permissions); } catch { ud.permissions = {}; } }
      let dept = null;
      if (ud.departmentId) dept = await prisma.department.findUnique({ id: ud.departmentId });
      userData = { ...ud, department: dept };
    }

    const token = jwt.sign(
      { id: userData.id, role: userData.role, hierarchyLevel: userData.hierarchyLevel || 1, permissions: userData.permissions || {} },
      process.env.JWT_SECRET || "secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ user: userData, token });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/demo-login", async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!["ADMIN", "MANAGER", "MEMBER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    let targetRole = role;
    if (role === "MEMBER") targetRole = "MEMBER";
    const user = await prisma.user.findFirst({ where: { role: targetRole } });
    if (!user) return res.status(404).json({ error: `No ${role.toLowerCase()} user found` });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "secret", { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    let dept = null;
    if (user.departmentId) dept = await prisma.department.findUnique({ id: user.departmentId });
    const { password: _, ...userData } = user;
    if (typeof userData.permissions === "string") { try { userData.permissions = JSON.parse(userData.permissions); } catch { userData.permissions = {}; } }
    res.json({ user: { ...userData, department: dept }, token });
  } catch {
    res.status(500).json({ error: "Demo login failed" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user!.id.startsWith("portal_")) {
    return res.json({ ...req.user, department: null });
  }
  const user = await prisma.user.findUnique({ id: req.user!.id });
  if (!user) return res.status(404).json({ error: "User not found" });
  let dept = null;
  if (user.departmentId) {
    dept = await prisma.department.findUnique({ id: user.departmentId });
  }
  const { password: _, ...userData } = user;
  if (typeof userData.permissions === "string") { try { userData.permissions = JSON.parse(userData.permissions); } catch { userData.permissions = {}; } }
  res.json({ ...userData, department: dept });
});

export default router;

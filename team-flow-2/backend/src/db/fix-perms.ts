import { prisma } from "./index";

const DEFAULT_PERMS: Record<string, Record<string, boolean>> = {
  ADMIN: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: true, canViewTeam: true, canViewAdmin: true, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: true, canDeleteProjects: true, canManagePermissions: true },
  MANAGER: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: true, canViewTeam: true, canViewAdmin: false, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
  TEAM_LEAD: { canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: false, canViewTeam: true, canViewAdmin: false, canViewActivityLog: false, canViewCalendar: true, canViewMyTasks: true, canReviewTask: true, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
  MEMBER: { canViewDashboard: true, canViewProjects: true, canAssignTask: false, canViewReports: false, canViewTeam: true, canViewAdmin: false, canViewActivityLog: true, canViewCalendar: true, canViewMyTasks: true, canReviewTask: false, canManageUsers: false, canDeleteProjects: false, canManagePermissions: false },
};
const HIERARCHY: Record<string, number> = { ADMIN: 4, MANAGER: 3, TEAM_LEAD: 2, MEMBER: 1 };

async function main() {
  const users = await prisma.user.findMany({});
  for (const u of users) {
    let perms: Record<string, boolean> = {};
    try { perms = JSON.parse(u.permissions || "{}"); } catch {}
    if (Object.keys(perms).length === 0) {
      perms = DEFAULT_PERMS[u.role] || DEFAULT_PERMS.MEMBER;
    }
    const level = u.hierarchyLevel || HIERARCHY[u.role] || 1;
    await prisma.user.update({ id: u.id }, { permissions: JSON.stringify(perms), hierarchyLevel: level });
    console.log("Updated", u.name, u.role, "level:", level);
  }
  console.log("Done");
}
main().catch(console.error).finally(() => process.exit(0));

import { PgClient } from "../db/pg-client";

export interface DataPortalUser {
  empId: string;
  name: string;
  email: string;
  designation: string;
  subdepartment: string;
  portalPerms: Record<string, boolean>;
  employmentStatus: string;
  branchTagging: string;
  isBlocked: boolean;
}

export interface DataPortalEmployee {
  employeeCode: string;
  employmentStatus: string;
  finalEmploymentStatus: string;
  designation: string;
  department: string;
  subDepartment: string;
  reportingManager: string;
  hod: string;
  branchName: string;
}

const PORTAL_PERM_COLS = [
  "dashboard", "login", "disb", "crm", "collection", "allok", "allinone",
  "imd", "penalty", "sanctioned_cases", "leads", "ro_performance",
  "employee_performance", "mom", "pd", "user_logining", "dod", "visit",
  "coll_modules", "coll_home", "download_report", "relook_team",
  "executive_dashboard", "attendence", "atten_summ", "capacitization",
  "branch_feed", "exception_feed", "incentive_policy", "upload_pending",
  "leads_entry", "Run_Scripts", "Target_Entry", "Account_Aggregator",
  "Coll Dashboard", "collection_download_report", "paid_cases",
  "unpaid_cases", "tech_status", "fintelligence", "ranking",
  "receipt_check", "customer_segmentation",
];

const PG_ENABLED = !!(process.env.PG_HOST && process.env.PG_USER);

let pgInstance: PgClient | null = null;

async function getPg(): Promise<PgClient> {
  if (pgInstance) return pgInstance;
  pgInstance = new PgClient({
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432"),
    database: process.env.PG_DATABASE || "data_portal",
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "",
  });
  await pgInstance.connect();
  return pgInstance;
}

export async function findDataPortalUser(empId: string): Promise<DataPortalUser | null> {
  if (!PG_ENABLED) return null;
  try {
    const pg = await getPg();
    const users = await pg.query(
      `SELECT * FROM data_portal.db_users WHERE "EmpId" = ${parseInt(empId.replace(/\D/g, "")) || 0} LIMIT 1`
    );
    if (!users.length) return null;
    const u = users[0];
    const perms: Record<string, boolean> = {};
    for (const col of PORTAL_PERM_COLS) {
      perms[col] = u[col] === 1 || u[col] === "1" || u[col] === true;
    }
    return {
      empId: String(u.EmpId || ""),
      name: u.name || "",
      email: u.email || "",
      designation: u.designation || "",
      subdepartment: u.subdepartment || "",
      portalPerms: perms,
      employmentStatus: u["Employment Status"] || "",
      branchTagging: u["Branch_Tagging"] || "",
      isBlocked: u.is_blocked === true || u.is_blocked === 1 || u.is_blocked === "1",
    };
  } catch (err) {
    console.error("PostgreSQL query error:", (err as Error).message);
    return null;
  }
}

export async function findDataPortalEmployee(empId: string): Promise<DataPortalEmployee | null> {
  if (!PG_ENABLED) return null;
  try {
    const pg = await getPg();
    const code = `EMP${empId.replace(/\D/g, "").padStart(3, "0")}`;
    const employees = await pg.query(
      `SELECT * FROM data_portal.db_main_employee_data WHERE "Employee Code" = '${code}' LIMIT 1`
    );
    if (!employees.length) {
      const employees2 = await pg.query(
        `SELECT * FROM data_portal.db_main_employee_data WHERE "Employee Code" LIKE '%${empId.replace(/\D/g, "")}%' LIMIT 1`
      );
      if (!employees2.length) return null;
      return rowToEmployee(employees2[0]);
    }
    return rowToEmployee(employees[0]);
  } catch (err) {
    console.error("PostgreSQL employee query error:", (err as Error).message);
    return null;
  }
}

function rowToEmployee(row: any): DataPortalEmployee {
  return {
    employeeCode: row["Employee Code"] || "",
    employmentStatus: row["Employment Status"] || "",
    finalEmploymentStatus: row["Final Employment Status"] || "",
    designation: row["Designation"] || "",
    department: row["Department"] || "",
    subDepartment: row["Sub-Department"] || "",
    reportingManager: row["Reporting Manager"] || "",
    hod: row["HOD"] || "",
    branchName: row["Branch Name"] || "",
  };
}

export function mapPortalPermsToTeamFlow(portalPerms: Record<string, boolean>): Record<string, boolean> {
  return {
    canViewDashboard: portalPerms.dashboard === true,
    canViewProjects: true,
    canAssignTask: portalPerms.allinone === true || portalPerms.allok === true,
    canViewReports: portalPerms.ro_performance === true || portalPerms.employee_performance === true,
    canViewTeam: true,
    canViewAdmin: portalPerms.allok === true,
    canViewActivityLog: true,
    canViewCalendar: true,
    canViewMyTasks: true,
    canReviewTask: portalPerms.allinone === true || portalPerms.allok === true,
    canManageUsers: portalPerms.allok === true,
    canDeleteProjects: portalPerms.allok === true,
    canManagePermissions: portalPerms.allok === true,
  };
}

export function deriveRole(department: string, designation: string): string {
  const d = (department || "").toLowerCase();
  const des = (designation || "").toLowerCase();
  if (d.includes("admin") || d.includes("hod") || des.includes("admin")) return "ADMIN";
  if (des.includes("manager") || des.includes("sr.") || des.includes("senior") || d.includes("manager")) return "MANAGER";
  return "MEMBER";
}

export function deriveHierarchyLevel(role: string): number {
  return { ADMIN: 4, MANAGER: 3, TEAM_LEAD: 2, MEMBER: 1 }[role] || 1;
}

export async function closePg(): Promise<void> {
  if (pgInstance) {
    await pgInstance.close();
    pgInstance = null;
  }
}

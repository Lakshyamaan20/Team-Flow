import bcrypt from "bcryptjs";
import { initDb, prisma } from "./index";

const departments = [
  { name: "Engineering" },
  { name: "Design" },
  { name: "Marketing" },
  { name: "Operations" },
  { name: "Finance" },
];

const managers = [
  { name: "Priya Sharma", deptIdx: 0 },
  { name: "Amit Verma", deptIdx: 0 },
  { name: "Sneha Patel", deptIdx: 1 },
  { name: "Rohan Mehta", deptIdx: 1 },
  { name: "Deepa Iyer", deptIdx: 2 },
  { name: "Karan Joshi", deptIdx: 2 },
  { name: "Neha Gupta", deptIdx: 3 },
  { name: "Vikram Rao", deptIdx: 4 },
];

const memberNames = [
  ["Arjun Nair", "Divya K.", "Ravi Shastri", "Meera Iyer", "Siddharth C.", "Kavita Menon"],
  ["Rahul D.", "Pooja Singh", "Vivek Saxena", "Anjali Kulkarni", "Harsh Vardhan", "Shruti Agarwal"],
  ["Manish Tiwari", "Lakshmi N.", "Nitin P.", "Rekha Sharma", "Aditya Joshi", "Pallavi Desai"],
  ["Sachin K.", "Rupali B.", "Gaurav M.", "Swati G.", "Tarun S.", "Bhavana Rao"],
  ["Akash Verma", "Nandini R.", "Purushottam S.", "Ayesha K.", "Deepak Yadav", "Shalini M."],
  ["Vijay P.", "Kritika A.", "Hemanth G.", "Sonal B.", "Prakash R.", "Isha Mehta"],
  ["Mohan L.", "Tanya S.", "Dinesh K.", "Preeti W.", "Naveen C.", "Ankita R."],
  ["Sunil D.", "Jyoti P.", "Karthik N.", "Smita J.", "Rohit G.", "Neelam K."],
];

const projectDomains = [
  "Core Platform",
  "Data & Analytics",
  "Infrastructure & DevOps",
  "User Experience",
];

const taskTemplates = [
  { title: "Design system architecture", priority: "HIGH" },
  { title: "Implement login module", priority: "CRITICAL" },
  { title: "Build dashboard UI", priority: "HIGH" },
  { title: "Write API documentation", priority: "MEDIUM" },
  { title: "Create test suite", priority: "MEDIUM" },
  { title: "Performance optimization", priority: "HIGH" },
  { title: "Database indexing", priority: "LOW" },
  { title: "Setup CI/CD pipeline", priority: "MEDIUM" },
  { title: "Mobile responsive layout", priority: "HIGH" },
  { title: "Data migration script", priority: "MEDIUM" },
  { title: "Audit logging module", priority: "LOW" },
  { title: "User notification system", priority: "MEDIUM" },
  { title: "Search functionality", priority: "HIGH" },
  { title: "Export reports feature", priority: "MEDIUM" },
  { title: "Third-party integration", priority: "HIGH" },
  { title: "Security audit fixes", priority: "CRITICAL" },
  { title: "Load balancer config", priority: "MEDIUM" },
  { title: "Backup automation", priority: "LOW" },
  { title: "UI component library", priority: "HIGH" },
  { title: "Rate limiting middleware", priority: "MEDIUM" },
  { title: "API gateway setup", priority: "HIGH" },
  { title: "Webhook integration", priority: "MEDIUM" },
  { title: "Dashboard widgets", priority: "LOW" },
  { title: "Alerting system", priority: "HIGH" },
  { title: "Role-based access", priority: "CRITICAL" },
  { title: "File upload service", priority: "MEDIUM" },
  { title: "Email templates", priority: "LOW" },
  { title: "Caching layer", priority: "HIGH" },
  { title: "Payment integration", priority: "CRITICAL" },
  { title: "Analytics pipeline", priority: "MEDIUM" },
  { title: "Dark mode support", priority: "LOW" },
  { title: "Multi-language i18n", priority: "MEDIUM" },
];

const statuses = ["TODO", "IN_PROGRESS", "REVIEW", "PENDING_APPROVAL", "DONE"];

const actions = ["task_created", "status_change", "task_updated"];

function randomDaysAgo(max: number) {
  return Date.now() - Math.floor(Math.random() * max) * 86400000;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const defaultPerms: Record<string, any> = {
  ADMIN: {
    canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: true,
    canViewTeam: true, canViewAdmin: true, canViewActivityLog: true, canViewCalendar: true,
    canViewMyTasks: true, canReviewTask: true, canManageUsers: true, canDeleteProjects: true,
    canManagePermissions: true,
  },
  MANAGER: {
    canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: true,
    canViewTeam: true, canViewAdmin: false, canViewActivityLog: true, canViewCalendar: true,
    canViewMyTasks: true, canReviewTask: true, canManageUsers: false, canDeleteProjects: false,
    canManagePermissions: false,
  },
  TEAM_LEAD: {
    canViewDashboard: true, canViewProjects: true, canAssignTask: true, canViewReports: false,
    canViewTeam: true, canViewAdmin: false, canViewActivityLog: false, canViewCalendar: true,
    canViewMyTasks: true, canReviewTask: true, canManageUsers: false, canDeleteProjects: false,
    canManagePermissions: false,
  },
  MEMBER: {
    canViewDashboard: true, canViewProjects: true, canAssignTask: false, canViewReports: false,
    canViewTeam: true, canViewAdmin: false, canViewActivityLog: true, canViewCalendar: true,
    canViewMyTasks: true, canReviewTask: false, canManageUsers: false, canDeleteProjects: false,
    canManagePermissions: false,
  },
};

const hierarchyLevels: Record<string, number> = { ADMIN: 4, MANAGER: 3, TEAM_LEAD: 2, MEMBER: 1 };

async function main() {
  await initDb();

  const pw = await bcrypt.hash("password123", 12);
  const deptIds: any[] = [];
  const mgrIds: any[] = [];
  const memberIds: any[] = [];
  const projectIds: any[] = [];

  for (const d of departments) {
    deptIds.push(await prisma.department.create({ name: d.name }));
  }

  const admin = await prisma.user.create({
    email: "admin@finova.in", password: pw, name: "Rajesh Kumar", role: "ADMIN",
    hierarchyLevel: 4, permissions: JSON.stringify(defaultPerms.ADMIN),
  });

  for (let i = 0; i < managers.length; i++) {
    const empId = `MGR${String(i + 1).padStart(3, "0")}`;
    const m = managers[i];
    const mgr = await prisma.user.create({
      email: `${empId.toLowerCase()}@finova.in`, password: pw, name: m.name, role: "MANAGER",
      departmentId: deptIds[m.deptIdx].id, hierarchyLevel: 3, permissions: JSON.stringify(defaultPerms.MANAGER),
    });
    mgrIds.push(mgr);

    const members = memberNames[i];
    const teamMemberIds: any[] = [];
    for (let j = 0; j < members.length; j++) {
      const empId2 = `EMP${String(i * 6 + j + 1).padStart(3, "0")}`;
      const mem = await prisma.user.create({
        email: `${empId2.toLowerCase()}@finova.in`, password: pw, name: members[j], role: "MEMBER",
        departmentId: deptIds[m.deptIdx].id, hierarchyLevel: 1, permissions: JSON.stringify(defaultPerms.MEMBER),
      });
      teamMemberIds.push(mem);
      memberIds.push(mem);
    }

    let taskIdx = 0;
    for (let p = 0; p < projectDomains.length; p++) {
      const project = await prisma.project.create({
        name: `${m.name.split(" ")[0]}'s ${projectDomains[p]}`,
        description: `${departments[m.deptIdx].name} ${projectDomains[p].toLowerCase()} — managed by ${m.name}`,
        startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 60 * 86400000).toISOString(),
        departmentId: deptIds[m.deptIdx].id,
        createdBy: mgr.id,
      });
      projectIds.push(project);

      for (let k = 0; k < 6; k++) {
        const tmpl = taskTemplates[taskIdx % taskTemplates.length];
        const assignee = teamMemberIds[k % teamMemberIds.length];
        const status = pick(statuses);
        const dueDate = new Date(Date.now() + (Math.floor(Math.random() * 30) - 5) * 86400000).toISOString();
        const reviewAttrs: any = {};
        if (status === "DONE") {
          reviewAttrs.reviewScore = Math.floor(Math.random() * 4) + 7;
          reviewAttrs.reviewComment = ["Great work!", "Well done!", "Good quality", "On time and complete", "Needs more testing"][Math.floor(Math.random() * 5)];
        } else if (status === "REVIEW") {
          reviewAttrs.reviewScore = Math.floor(Math.random() * 4) + 4;
          reviewAttrs.reviewComment = ["Almost there", "Minor fixes needed", "Good progress"][Math.floor(Math.random() * 3)];
        }
        const task = await prisma.task.create({
          title: tmpl.title,
          status,
          priority: tmpl.priority,
          projectId: project.id,
          assigneeId: assignee.id,
          createdById: mgr.id,
          estimatedHours: Math.floor(Math.random() * 24) + 4,
          dueDate,
          ...reviewAttrs,
        });

        await prisma.activityLog.create({
          action: "task_created", details: `Task created and assigned to ${assignee.name}`,
          taskId: task.id, userId: mgr.id, createdAt: new Date(randomDaysAgo(20)).toISOString(),
        });

        if (status !== "TODO") {
          await prisma.activityLog.create({
            action: "status_change", details: `TODO → ${status}`,
            taskId: task.id, userId: assignee.id, createdAt: new Date(randomDaysAgo(10)).toISOString(),
          });
        }
        if (reviewAttrs.reviewScore) {
          await prisma.activityLog.create({
            action: "task_reviewed", details: `Task reviewed by ${m.name}: scored ${reviewAttrs.reviewScore}/10 — "${reviewAttrs.reviewComment}"`,
            taskId: task.id, userId: mgr.id, createdAt: new Date(randomDaysAgo(2)).toISOString(),
          });
        }

        if (status !== "TODO" && Math.random() > 0.3) {
          const daysAgo = Math.floor(Math.random() * 5) + 1;
          const entryDate = new Date(Date.now() - daysAgo * 86400000);
          const hours = Math.round((Math.random() * 6 + 1) * 100) / 100;
          await prisma.timeEntry.create({
            taskId: task.id,
            userId: assignee.id,
            date: entryDate.toISOString().split("T")[0],
            hours,
            description: ["Working on implementation", "Code review fixes", "Testing and debugging", "Documentation update", ""][Math.floor(Math.random() * 5)],
          });
          if (Math.random() > 0.6) {
            const entryDate2 = new Date(Date.now() - (daysAgo - 1) * 86400000);
            await prisma.timeEntry.create({
              taskId: task.id,
              userId: assignee.id,
              date: entryDate2.toISOString().split("T")[0],
              hours: Math.round((Math.random() * 4 + 0.5) * 100) / 100,
              description: "Continued progress",
            });
          }
        }
        await prisma.notification.create({
          userId: assignee.id, title: "New Task", message: `You have been assigned: "${tmpl.title}"`, type: "TASK_ASSIGNED",
        });

        taskIdx++;
      }
    }
  }

  for (let i = 1; i <= 7; i++) {
    const d = new Date(Date.now() - i * 86400000);
    if (Math.random() > 0.3) {
      await prisma.timeEntry.create({
        taskId: projectIds[0].id, userId: admin.id,
        date: d.toISOString().split("T")[0],
        hours: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
        description: ["Reviewing project updates", "Team sync meeting", "Code review", "Planning session", "Stakeholder meeting"][Math.floor(Math.random() * 5)],
      });
    }
  }

  await prisma.notification.create({
    userId: admin.id, title: "Welcome to Team Flow", message: "You are logged in as Admin. You have full access.", type: "INFO",
  });

  console.log("Database seeded successfully!");
}

main().catch((e) => { console.error(e); process.exit(1); });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const engineering = await prisma.department.create({ data: { name: "Engineering" } });
  const design = await prisma.department.create({ data: { name: "Design" } });
  const marketing = await prisma.department.create({ data: { name: "Marketing" } });

  const password = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: { email: "rajesh.kumar@finova.in", password, name: "Rajesh Kumar", role: "ADMIN" },
  });

  const manager = await prisma.user.create({
    data: { email: "priya.sharma@finova.in", password, name: "Priya Sharma", role: "MANAGER", departmentId: engineering.id },
  });

  const lead = await prisma.user.create({
    data: { email: "arun.patel@finova.in", password, name: "Arun Patel", role: "TEAM_LEAD", departmentId: engineering.id },
  });

  const member1 = await prisma.user.create({
    data: { email: "vikram.singh@finova.in", password, name: "Vikram Singh", role: "MEMBER", departmentId: engineering.id },
  });

  const member2 = await prisma.user.create({
    data: { email: "ananya.reddy@finova.in", password, name: "Ananya Reddy", role: "MEMBER", departmentId: engineering.id },
  });

  const project = await prisma.project.create({
    data: {
      name: "Team Flow Platform",
      description: "Build the core task management platform",
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      departmentId: engineering.id,
      createdBy: admin.id,
    },
  });

  const task1 = await prisma.task.create({
    data: {
      title: "Design database schema",
      description: "Create the Prisma schema for all entities",
      status: "DONE",
      priority: "HIGH",
      projectId: project.id,
      assigneeId: member1.id,
      createdById: lead.id,
      estimatedHours: 8,
      actualHours: 6,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      title: "Implement authentication",
      description: "JWT-based auth with login/register",
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      projectId: project.id,
      assigneeId: member1.id,
      createdById: lead.id,
      estimatedHours: 16,
      actualHours: 10,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      title: "Build Kanban board UI",
      description: "Drag-and-drop columns with real-time sync",
      status: "TODO",
      priority: "HIGH",
      projectId: project.id,
      assigneeId: member2.id,
      createdById: lead.id,
      estimatedHours: 24,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      title: "Create Gantt chart component",
      description: "Timeline view with task dependencies",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project.id,
      assigneeId: member2.id,
      createdById: lead.id,
      estimatedHours: 20,
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed data created successfully");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

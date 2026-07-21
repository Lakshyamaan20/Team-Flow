import { prisma } from "./index";

const H: Record<string, number> = { ADMIN: 4, MANAGER: 3, TEAM_LEAD: 2, MEMBER: 1 };

async function main() {
  const users = await prisma.user.findMany({});
  for (const u of users) {
    await prisma.user.update({ id: u.id }, { hierarchyLevel: H[u.role] || 1 });
    console.log("Set", u.name, u.role, "-> level", H[u.role] || 1);
  }
  console.log("Done");
}
main().catch(console.error).finally(() => process.exit(0));

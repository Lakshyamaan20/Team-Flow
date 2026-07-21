import { useQuery } from "@tanstack/react-query";
import { users } from "../services/api";
import Avatar from "../components/Avatar";

const roleBadges: Record<string, string> = { ADMIN: "badge-red", MANAGER: "badge-blue", TEAM_LEAD: "badge-yellow", MEMBER: "badge-gray" };

export default function Team() {
  const { data: userList } = useQuery({ queryKey: ["users"], queryFn: users.list });

  const grouped = userList?.reduce((acc: any, u: any) => {
    const dept = u.department?.name || "Unassigned";
    if (!acc[dept]) acc[dept] = []; acc[dept].push(u); return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Team</h1>
        <p className="page-subtitle">View your organization structure</p>
      </div>
      {grouped && Object.entries(grouped).map(([dept, members]: [string, any]) => (
        <div key={dept}>
          <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-3">{dept} <span className="font-normal text-surface-300">({members.length})</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((u: any) => (
              <div key={u.id} className="card flex items-center gap-4 p-4">
                <Avatar name={u.name} size="md" />
                <div>
                  <p className="font-medium text-sm text-surface-800">{u.name}</p>
                  <p className="text-xs text-surface-400">{u.email}</p>
                  <span className={roleBadges[u.role]}>{u.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

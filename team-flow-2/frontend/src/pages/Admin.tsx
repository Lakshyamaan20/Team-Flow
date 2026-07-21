import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { users, permissionsApi, projects, departments as deptApi } from "../services/api";
import { useToastStore } from "../store/toastStore";
import { useState } from "react";

const roles = ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"];
const roleBadges: Record<string, string> = { ADMIN: "badge-red", MANAGER: "badge-blue", TEAM_LEAD: "badge-yellow", MEMBER: "badge-gray" };

const permLabels: Record<string, string> = {
  canViewDashboard: "Dashboard", canViewProjects: "Projects", canAssignTask: "Assign Task",
  canViewReports: "Reports", canViewTeam: "Team", canViewAdmin: "Admin",
  canViewActivityLog: "Activity Log", canViewCalendar: "Calendar", canViewMyTasks: "My Tasks",
  canReviewTask: "Review Task", canManageUsers: "Manage Users", canDeleteProjects: "Delete Projects",
  canManagePermissions: "Manage Permissions",
};

export default function Admin() {
  const { data: userList } = useQuery({ queryKey: ["users"], queryFn: users.list });
  const { data: permData } = useQuery({ queryKey: ["permissions"], queryFn: permissionsApi.list, refetchInterval: 10000 });
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [tab, setTab] = useState<"users" | "permissions" | "projects">("users");

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => users.updateRole(id, role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); addToast("Role updated"); },
    onError: () => addToast("Failed to update role", "error"),
  });

  const updatePerms = useMutation({
    mutationFn: ({ userId, permissions, hierarchyLevel }: { userId: string; permissions?: Record<string, boolean>; hierarchyLevel?: number }) =>
      permissionsApi.update(userId, { permissions, hierarchyLevel }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["permissions"] }); addToast("Permissions updated"); },
    onError: () => addToast("Failed to update permissions", "error"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage users, roles, and permissions</p>
      </div>

      <div className="tabs">
        <button onClick={() => setTab("users")} className={`tab ${tab === "users" ? "active" : ""}`}>User Management</button>
        <button onClick={() => setTab("permissions")} className={`tab ${tab === "permissions" ? "active" : ""}`}>Permissions</button>
        <button onClick={() => setTab("projects")} className={`tab ${tab === "projects" ? "active" : ""}`}>Project Assignment</button>
      </div>

      {tab === "users" && (
        <div className="card p-0 overflow-hidden">
          <div className="p-5 border-b border-surface-100"><h2 className="text-sm font-semibold text-surface-800">User Management</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-50">
                <th className="table-header text-left py-3 px-5">Name</th>
                <th className="table-header text-left py-3 px-5">Email</th>
                <th className="table-header text-left py-3 px-5">Dept</th>
                <th className="table-header text-left py-3 px-5">Role</th>
                <th className="table-header text-left py-3 px-5">Level</th>
                <th className="table-header text-left py-3 px-5">Actions</th>
              </tr></thead>
              <tbody>{userList?.map((u: any) => (
                <tr key={u.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <td className="py-3 px-5 font-medium text-surface-800">{u.name}</td>
                  <td className="py-3 px-5 text-surface-500">{u.email}</td>
                  <td className="py-3 px-5 text-surface-600">{u.department?.name || <span className="text-surface-300">-</span>}</td>
                  <td className="py-3 px-5">
                    <select defaultValue={u.role} onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                      className="text-xs rounded-lg border border-surface-200 px-2 py-1 text-surface-600 bg-white outline-none focus:border-brand-400">
                      {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-5 text-surface-600">{u.hierarchyLevel || "-"}</td>
                  <td className="py-3 px-5"><span className={roleBadges[u.role]}>{u.role}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "projects" && (
        <ProjectsManager />
      )}

      {tab === "permissions" && (
        <div className="card p-0 overflow-hidden">
          <div className="p-5 border-b border-surface-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-800">Permission Matrix</h2>
            <span className="text-xs text-surface-400">Toggle permissions per user</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-50">
                <th className="table-header text-left py-2.5 px-4 whitespace-nowrap">User</th>
                {permData?.allPermissions?.map((p: string) => (
                  <th key={p} className="table-header text-center py-2.5 px-2 text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {permLabels[p] || p.replace("can", "")}
                  </th>
                ))}
                <th className="table-header text-center py-2.5 px-2 text-[10px] uppercase tracking-wider whitespace-nowrap">Level</th>
              </tr></thead>
              <tbody>{permData?.users?.map((u: any) => (
                <tr key={u.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                  <td className="py-2 px-4 text-surface-800 text-xs font-medium whitespace-nowrap">{u.name}</td>
                  {permData.allPermissions.map((p: string) => (
                    <td key={p} className="text-center py-2 px-2">
                      <button
                        onClick={() => {
                          const newPerms = { ...u.permissions, [p]: !u.permissions?.[p] };
                          updatePerms.mutate({ userId: u.id, permissions: newPerms });
                        }}
                        className={`w-5 h-5 rounded border transition-colors ${
                          u.permissions?.[p]
                            ? "bg-brand-500 border-brand-500"
                            : "bg-surface-100 border-surface-300"
                        }`}
                      >
                        {u.permissions?.[p] && (
                          <svg className="w-3 h-3 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                  ))}
                  <td className="text-center py-2 px-2">
                    <select
                      value={u.hierarchyLevel || 1}
                      onChange={(e) => updatePerms.mutate({ userId: u.id, hierarchyLevel: parseInt(e.target.value) })}
                      className="text-[10px] rounded border border-surface-200 px-1 py-0.5 text-surface-600 bg-white outline-none focus:border-brand-400"
                    >
                      {[1, 2, 3, 4].map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectsManager() {
  const { data: projectList } = useQuery({ queryKey: ["projects"], queryFn: projects.list });
  const { data: userList } = useQuery({ queryKey: ["users"], queryFn: users.list });
  const { data: deptList } = useQuery({ queryKey: ["departments"], queryFn: deptApi.list });
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const managers = userList?.filter((u: any) => u.role === "MANAGER") || [];

  const updateManager = useMutation({
    mutationFn: ({ id, createdBy }: { id: string; createdBy: string }) => projects.update(id, { createdBy }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); addToast("Manager updated"); },
    onError: () => addToast("Failed to update manager", "error"),
  });

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-5 border-b border-surface-100"><h2 className="text-sm font-semibold text-surface-800">Project Manager Assignment</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-50">
            <th className="table-header text-left py-3 px-5">Project</th>
            <th className="table-header text-left py-3 px-5">Department</th>
            <th className="table-header text-left py-3 px-5">Current Manager</th>
            <th className="table-header text-left py-3 px-5">Reassign To</th>
          </tr></thead>
          <tbody>{projectList?.map((p: any) => (
            <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
              <td className="py-3 px-5 font-medium text-surface-800">{p.name}</td>
              <td className="py-3 px-5 text-surface-500">{p.department?.name || "-"}</td>
              <td className="py-3 px-5 text-surface-600">{p.manager?.name || <span className="text-surface-300">Unassigned</span>}</td>
              <td className="py-3 px-5">
                <select
                  defaultValue={p.createdBy || ""}
                  onChange={(e) => { const v = e.target.value; if (v) updateManager.mutate({ id: p.id, createdBy: v }); }}
                  className="text-xs rounded-lg border border-surface-200 px-2 py-1 text-surface-600 bg-white outline-none focus:border-brand-400"
                >
                  <option value="">Select manager...</option>
                  {managers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
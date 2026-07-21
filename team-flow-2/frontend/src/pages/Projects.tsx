import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projects, users, departments as deptApi } from "../services/api";
import { Link } from "react-router-dom";
import { useState } from "react";
import { SkeletonCard } from "../components/Skeleton";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import Avatar from "../components/Avatar";

const statusClasses: Record<string, string> = {
  ACTIVE: "badge-green",
  COMPLETED: "badge-blue",
  ON_HOLD: "badge-yellow",
};

export default function Projects() {
  const { data: projectList, isLoading } = useQuery({ queryKey: ["projects"], queryFn: projects.list });
  const { data: userList } = useQuery({ queryKey: ["users"], queryFn: users.list });
  const { data: deptList } = useQuery({ queryKey: ["departments"], queryFn: deptApi.list });
  const { hasRole, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", startDate: "", endDate: "", departmentId: "", createdBy: "" });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const { addToast } = useToastStore();

  const isAdmin = user?.role === "ADMIN";
  const managers = userList?.filter((u: any) => u.role === "MANAGER") || [];

  const createMutation = useMutation({
    mutationFn: projects.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setForm({ name: "", description: "", startDate: "", endDate: "", departmentId: "", createdBy: "" });
      addToast("Project created successfully!");
    },
    onError: () => addToast("Failed to create project", "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage all your team projects</p>
        </div>
        {hasRole("ADMIN", "MANAGER") && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showForm ? "Cancel" : "New Project"}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card animate-slide-up">
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Start Date</label>
                <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">End Date</label>
                <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Department</label>
                <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Select department</option>
                  {deptList?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Manager</label>
                <select className="input" value={form.createdBy} onChange={(e) => setForm({ ...form, createdBy: e.target.value })}>
                  <option value="">{isAdmin ? "Select manager..." : "Assign to me"}</option>
                  {isAdmin && managers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary">Create Project</button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
      <><div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search projects..." className="input pl-9 text-sm w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm w-36" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
        <select className="input text-sm w-40" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {deptList?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {(() => {
        const filtered = projectList?.filter((p: any) => {
          if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
          if (filterStatus && p.status !== filterStatus) return false;
          if (filterDept && p.departmentId !== filterDept) return false;
          return true;
        });
        return !filtered?.length ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-surface-400">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No projects match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p: any) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="card group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-bold group-hover:bg-brand-100 transition-colors">
                  {p.name.charAt(0)}
                </div>
                <span className={statusClasses[p.status] || "badge-gray"}>{p.status}</span>
              </div>
              <h3 className="font-semibold text-surface-800 group-hover:text-brand-600 transition-colors">{p.name}</h3>
              <p className="text-sm text-surface-400 line-clamp-2 mt-1 mb-4">{p.description || "No description"}</p>
              {p._count?.tasks > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-surface-500">Progress</span>
                    <span className="font-medium text-surface-600">{p.completionPercent || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-100">
                    <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${p.completionPercent || 0}%` }} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-surface-400 pt-3 border-t border-surface-100">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {p._count?.tasks || 0} tasks
                </span>
                <span className="text-surface-400 flex items-center gap-1.5">
                  {p.manager ? <><Avatar name={p.manager.name} size="sm" />{p.manager.name}</> : p.department?.name || ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
          )})()}
        </>)}
    </div>
  );
}

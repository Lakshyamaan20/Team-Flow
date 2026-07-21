import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasks } from "../services/api";
import { Link } from "react-router-dom";
import { useToastStore } from "../store/toastStore";
import { useAuthStore } from "../store/authStore";
import { useState } from "react";
import TaskDetailDrawer from "../components/TaskDetailDrawer";
import { SkeletonRow } from "../components/Skeleton";

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "REVIEW", "PENDING_APPROVAL", "DONE"];

export default function MyTasks() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const isManager = user?.role === "MANAGER";
  const isAdmin = user?.role === "ADMIN";
  const canBulk = isManager || isAdmin;
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const { data: myTasks, isLoading } = useQuery({
    queryKey: ["myTasks"],
    queryFn: tasks.myTasks,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tasks.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      addToast("Status updated!");
      if (variables.status === "DONE" || variables.status === "PENDING_APPROVAL") {
        import("../utils/confetti").then((m) => m.fireConfetti());
      }
    },
    onError: () => addToast("Failed to update status", "error"),
  });

  const bulkMutation = useMutation({
    mutationFn: (data: { taskIds: string[]; action: string; value?: string }) => tasks.bulk(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      setSelectedIds([]);
      addToast(`Bulk ${vars.action} completed (${vars.taskIds.length} tasks)`);
    },
    onError: () => addToast("Bulk operation failed", "error"),
  });

  const allFiltered = myTasks ? (() => {
    return myTasks.filter((t: any) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.project?.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterProject && t.project?.name !== filterProject) return false;
      return true;
    });
  })() : [];

  const toggleAll = () => {
    if (selectedIds.length === allFiltered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFiltered.map((t: any) => t.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Tasks</h1>
        <p className="page-subtitle">{isAdmin ? "All tasks across all projects" : isManager ? "All tasks in your projects" : "Tasks assigned to you"}</p>
      </div>

      {selectedIds.length > 0 && canBulk && (
        <div className="sticky top-16 z-40 -mx-6 px-6 py-3 bg-brand-600/95 backdrop-blur-md border border-brand-500/40 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in">
          <span className="text-sm font-semibold text-white">{selectedIds.length} selected</span>
          <div className="w-px h-5 bg-white/20" />
          <select onChange={(e) => { const v = e.target.value; if (v) { bulkMutation.mutate({ taskIds: selectedIds, action: "status", value: v }); e.target.value = ""; } }} className="text-xs rounded-lg bg-white/15 text-white border border-white/20 px-3 py-1.5 outline-none">
            <option value="" className="text-surface-800">Change Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="text-surface-800">{s === "IN_PROGRESS" ? "In Progress" : s === "PENDING_APPROVAL" ? "Pending Approval" : s === "TODO" ? "To Do" : s}</option>)}
          </select>
          <select onChange={(e) => { const v = e.target.value; if (v) { bulkMutation.mutate({ taskIds: selectedIds, action: "priority", value: v }); e.target.value = ""; } }} className="text-xs rounded-lg bg-white/15 text-white border border-white/20 px-3 py-1.5 outline-none">
            <option value="" className="text-surface-800">Change Priority</option>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => <option key={p} value={p} className="text-surface-800">{p}</option>)}
          </select>
          <button onClick={() => { if (confirm(`Delete ${selectedIds.length} tasks?`)) bulkMutation.mutate({ taskIds: selectedIds, action: "delete" }); }} disabled={bulkMutation.isPending} className="text-xs font-semibold bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            {bulkMutation.isPending ? "..." : "Delete"}
          </button>
          <button onClick={() => setSelectedIds([])} className="ml-auto text-xs text-white/70 hover:text-white transition-colors">Clear</button>
        </div>
      )}

      {isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-surface-50 border-b border-surface-200">
              {canBulk && <th className="w-10 px-2 py-3" />}
              {["Task","Project","Manager",...(isAdmin ? ["Assignee"] : []),"Status","Priority","Deadline","Review"].map(h => <th key={h} className="table-header px-5 py-3 text-left">{h}</th>)}
            </tr></thead>
            <tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={(canBulk ? 1 : 0) + (isAdmin ? 8 : 7)} />)}</tbody>
          </table>
        </div>
      ) : !myTasks || myTasks.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-surface-400 text-sm">{isAdmin ? "No tasks in the system yet." : "No tasks assigned to you yet."}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search tasks..." className="input pl-9 text-sm w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input text-sm w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="DONE">Done</option>
            </select>
            <select className="input text-sm w-32" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="">All Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <select className="input text-sm w-40" value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="">All Projects</option>
              {[...new Set(myTasks.map((t: any) => t.project?.name).filter(Boolean))].map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          {(() => {
            return allFiltered.length === 0 ? (
              <div className="card py-12 text-center text-surface-400 text-sm">No tasks match your filters</div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 border-b border-surface-200">
                      {canBulk && (
                        <th className="w-10 px-2 py-3 text-center">
                          <input type="checkbox" checked={selectedIds.length === allFiltered.length && allFiltered.length > 0} onChange={toggleAll} className="rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                        </th>
                      )}
                      <th className="table-header px-5 py-3 text-left">Task</th>
                      <th className="table-header px-5 py-3 text-left">Project</th>
                      <th className="table-header px-5 py-3 text-left">Manager</th>
                      {isAdmin && <th className="table-header px-5 py-3 text-left">Assignee</th>}
                      {isManager && <th className="table-header px-5 py-3 text-left">Assignee</th>}
                      <th className="table-header px-5 py-3 text-left">Status</th>
                      <th className="table-header px-5 py-3 text-left">Priority</th>
                      <th className="table-header px-5 py-3 text-left">Deadline</th>
                      <th className="table-header px-5 py-3 text-left">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFiltered.map((t: any) => (
                      <tr key={t.id} className="border-b border-surface-100 hover:bg-surface-50/60 transition-colors cursor-pointer" onClick={() => setSelectedTask(t)}>
                        {canBulk && (
                          <td className="px-2 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleOne(t.id)} className="rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <p className="font-medium text-surface-800">{t.title}</p>
                        </td>
                        <td className="px-5 py-4">
                          <Link to={`/projects/${t.projectId}`} className="text-brand-600 hover:text-brand-700 font-medium" onClick={(e) => e.stopPropagation()}>
                            {t.project?.name || "—"}
                          </Link>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-4">
                            <span className="text-surface-600">{t.project?.manager?.name || <span className="text-surface-300">—</span>}</span>
                          </td>
                        )}
                        {isAdmin && (
                          <td className="px-5 py-4">
                            <span className="text-surface-600">{t.assignee?.name || <span className="text-surface-300">Unassigned</span>}</span>
                          </td>
                        )}
                        {isManager && (
                          <td className="px-5 py-4">
                            <span className="text-surface-600">{t.project?.manager?.name || <span className="text-surface-300">—</span>}</span>
                          </td>
                        )}
                        {isManager && (
                          <td className="px-5 py-4">
                            <span className="text-surface-600">{t.assignee?.name || <span className="text-surface-300">Unassigned</span>}</span>
                          </td>
                        )}
                        {!isManager && !isAdmin && (
                          <td className="px-5 py-4">
                            <span className="text-surface-600">{t.project?.manager?.name || <span className="text-surface-300">—</span>}</span>
                          </td>
                        )}
                        <td className="px-5 py-4">
                          <select
                            value={t.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateStatus.mutate({ id: t.id, status: e.target.value })}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium border outline-none cursor-pointer ${
                              t.status === "DONE" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                              t.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 border-blue-200" :
                              t.status === "REVIEW" ? "bg-amber-100 text-amber-700 border-amber-200" :
                              t.status === "PENDING_APPROVAL" ? "bg-purple-100 text-purple-700 border-purple-200" :
                              "bg-surface-100 text-surface-600 border-surface-200"
                            }`}
                          >
                            {(isManager || isAdmin ? STATUS_OPTIONS : STATUS_OPTIONS.filter((s) => s !== "DONE")).map((s) => (
                              <option key={s} value={s}>
                                {s === "IN_PROGRESS" ? "In Progress" : s === "PENDING_APPROVAL" ? "Pending Approval" : s === "TODO" ? "To Do" : s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                            t.priority === "CRITICAL" || t.priority === "HIGH" ? "bg-red-100 text-red-700" :
                            t.priority === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                            "bg-surface-100 text-surface-500"
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-surface-600">
                          {t.dueDate ? (
                            <span className={new Date(t.dueDate) < new Date() && t.status !== "DONE" && t.status !== "PENDING_APPROVAL" ? "text-red-600 font-medium" : ""}>
                              {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          ) : (
                            <span className="text-surface-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {t.reviewScore ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-700">
                              {t.reviewScore}/10
                            </span>
                          ) : (
                            <span className="text-surface-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )})()}
        </>
      )}

      {selectedTask && <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
}

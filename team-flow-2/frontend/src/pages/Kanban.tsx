import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projects, tasks } from "../services/api";
import { SkeletonCard } from "../components/Skeleton";
import { useToastStore } from "../store/toastStore";
import Avatar from "../components/Avatar";

const columns = [
  { key: "TODO", label: "To Do", border: "border-t-surface-400" },
  { key: "IN_PROGRESS", label: "In Progress", border: "border-t-brand-500" },
  { key: "REVIEW", label: "Review", border: "border-t-amber-500" },
  { key: "PENDING_APPROVAL", label: "Pending Approval", border: "border-t-purple-500" },
  { key: "DONE", label: "Done", border: "border-t-emerald-500" },
];

function calcRisk(task: any): { score: number; level: string } {
  if (!task.dueDate) return { score: 0, level: "LOW" };
  if (task.status === "DONE") {
    const due = new Date(task.dueDate); const updated = task.updatedAt ? new Date(task.updatedAt) : new Date();
    return { score: updated > due ? 100 : 0, level: updated > due ? "HIGH" : "LOW" };
  }
  const now = new Date(); const due = new Date(task.dueDate);
  const totalDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (totalDays <= 0) return { score: 100, level: "HIGH" };
  const workLeft = task.estimatedHours ? Math.max(0, task.estimatedHours - (task.actualHours || 0)) : 1;
  const workRatio = workLeft / (task.estimatedHours || 1);
  const timeRatio = Math.min(1, 1 / totalDays);
  const score = Math.min(100, Math.max(0, Math.round((workRatio * 0.6 + timeRatio * 0.4) * 100 + (totalDays <= 1 ? 20 : totalDays <= 3 ? 10 : 0) + (task.status === "IN_PROGRESS" ? -5 : task.status === "REVIEW" ? -15 : 0))));
  return { score, level: score > 60 ? "HIGH" : score > 30 ? "MEDIUM" : "LOW" };
}

export default function Kanban() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => projects.get(id!), enabled: !!id });
  const { addToast } = useToastStore();

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => tasks.updateStatus(taskId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      addToast("Task status updated!");
      if (variables.status === "DONE" || variables.status === "PENDING_APPROVAL") {
        import("../utils/confetti").then((m) => m.fireConfetti());
      }
    },
    onError: () => addToast("Failed to update status", "error"),
  });
  const handleDragStart = (e: React.DragEvent, taskId: string) => e.dataTransfer.setData("taskId", taskId);
  const handleDrop = (e: React.DragEvent, status: string) => { e.preventDefault(); const taskId = e.dataTransfer.getData("taskId"); updateStatus.mutate({ taskId, status }); };

  if (!project) return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projects/${id}`} className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
        <h1 className="page-title mt-0.5">{project.name} — Kanban</h1>
      </div>
      <div className="grid grid-cols-5 gap-4" style={{ minHeight: "70vh" }}>
        {columns.map((col) => (
          <div key={col.key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.key)}
            className={`bg-surface-50 rounded-xl border-t-4 ${col.border} p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-700">{col.label}</h3>
              <span className="badge-gray text-xs">{project.tasks?.filter((t: any) => t.status === col.key).length || 0}</span>
            </div>
            <div className="space-y-2.5">
              {project.tasks?.filter((t: any) => t.status === col.key).map((task: any) => {
                const r = calcRisk(task);
                return (
                  <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-white rounded-lg p-3 border border-surface-200 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow">
                    <p className="text-sm font-medium text-surface-800 mb-1.5">{task.title}</p>
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {task.reviewScore && (
                      <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        {task.reviewScore}/10
                      </span>
                    )}
                    {task.assignee && <span className="text-xs text-surface-400 flex items-center gap-1.5">
                      <Avatar name={task.assignee.name} size="sm" />
                      {task.assignee.name}
                    </span>}
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${
                      r.level === "HIGH" ? "bg-red-100 text-red-700" :
                      r.level === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                      "bg-surface-100 text-surface-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        r.level === "HIGH" ? "bg-red-500" :
                        r.level === "MEDIUM" ? "bg-amber-500" :
                        "bg-surface-400"
                      }`} />
                      {task.dueDate ? `Risk ${r.score}%` : "No deadline"}
                    </span>
                  </div>
                );
              })}
              {(!project.tasks || project.tasks.filter((t: any) => t.status === col.key).length === 0) && (
                <div className="border-2 border-dashed border-surface-200 rounded-lg p-6 text-center"><p className="text-xs text-surface-300">Drop here</p></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

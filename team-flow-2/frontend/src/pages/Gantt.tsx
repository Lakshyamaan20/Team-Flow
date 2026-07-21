import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projects } from "../services/api";
import { format, differenceInDays, addDays } from "date-fns";
import { SkeletonCard } from "../components/Skeleton";

const statusColors: Record<string, string> = { DONE: "bg-emerald-500", IN_PROGRESS: "bg-brand-500", REVIEW: "bg-amber-500", PENDING_APPROVAL: "bg-purple-500", TODO: "bg-surface-400" };

export default function Gantt() {
  const { id } = useParams();
  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => projects.get(id!), enabled: !!id });
  if (!project) return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  const start = project.startDate ? new Date(project.startDate) : new Date();
  const end = project.endDate ? new Date(project.endDate) : addDays(start, 30);
  const total = differenceInDays(end, start) || 1;
  const today = new Date();
  const days = Array.from({ length: Math.min(total, 31) }, (_, i) => addDays(start, i));

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projects/${id}`} className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>
        <h1 className="page-title mt-0.5">{project.name} — Gantt</h1>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="min-w-[600px] p-5">
          <div className="flex border-b border-surface-200 pb-2 mb-2">
            <div className="w-48 flex-shrink-0"><span className="table-header">Task</span></div>
            {days.map((d, i) => (
              <div key={i} className="flex-1 text-center">
                <span className={`text-xs ${format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ? "text-brand-600 font-bold" : "text-surface-400"}`}>{format(d, "d")}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {project.tasks?.map((task: any) => {
              const taskStart = task.createdAt ? new Date(task.createdAt) : start;
              const taskEnd = task.dueDate ? new Date(task.dueDate) : addDays(taskStart, 3);
              const left = Math.max(0, differenceInDays(taskStart, start)) / total * 100;
              const w = Math.max(1, differenceInDays(taskEnd, taskStart)) / total * 100;
              return (
                <div key={task.id} className="flex items-center h-7">
                  <div className="w-48 flex-shrink-0 truncate pr-2"><span className="text-sm text-surface-700">{task.title}</span></div>
                  <div className="flex-1 relative bg-surface-100 rounded-full h-4">
                    <div className={`absolute h-full rounded-full ${statusColors[task.status] || "bg-surface-400"} opacity-70`} style={{ left: `${left}%`, width: `${w}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center mt-4 pt-3 border-t border-surface-200 text-xs text-surface-500 gap-4">
            {Object.entries(statusColors).map(([s, c]) => (
              <span key={s} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${c}`} />{s === "IN_PROGRESS" ? "In Progress" : s.charAt(0) + s.slice(1).toLowerCase()}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

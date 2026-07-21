import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projects, tasks, users, timeEntries } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { SkeletonCard } from "../components/Skeleton";

function calcRisk(task: any): { score: number; level: string } {
  if (!task.dueDate) return { score: 0, level: "LOW" };
  if (task.status === "DONE") {
    const due = new Date(task.dueDate);
    const updated = task.updatedAt ? new Date(task.updatedAt) : new Date();
    return { score: updated > due ? 100 : 0, level: updated > due ? "HIGH" : "LOW" };
  }
  const now = new Date();
  const due = new Date(task.dueDate);
  const totalDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (totalDays <= 0) return { score: 100, level: "HIGH" };
  const workLeft = task.estimatedHours ? Math.max(0, task.estimatedHours - (task.actualHours || 0)) : 1;
  const workRatio = workLeft / (task.estimatedHours || 1);
  const timeRatio = Math.min(1, 1 / totalDays);
  const baseScore = (workRatio * 0.6 + timeRatio * 0.4) * 100;
  const urgencyBonus = totalDays <= 1 ? 20 : totalDays <= 3 ? 10 : 0;
  const completionBonus = task.status === "IN_PROGRESS" ? -5 : task.status === "REVIEW" ? -15 : 0;
  const score = Math.min(100, Math.max(0, Math.round(baseScore + urgencyBonus + completionBonus)));
  const level = score > 60 ? "HIGH" : score > 30 ? "MEDIUM" : "LOW";
  return { score, level };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const statusBadges: Record<string, string> = { TODO: "badge-gray", IN_PROGRESS: "badge-blue", REVIEW: "badge-yellow", PENDING_APPROVAL: "badge-purple", DONE: "badge-green" };
const statusBorders: Record<string, string> = { TODO: "border-t-surface-300", IN_PROGRESS: "border-t-brand-500", REVIEW: "border-t-amber-500", PENDING_APPROVAL: "border-t-purple-500", DONE: "border-t-emerald-500" };

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [logTaskId, setLogTaskId] = useState<string | null>(null);
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerLogDesc, setTimerLogDesc] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id], queryFn: () => projects.get(id!), enabled: !!id,
  });
  const { data: userList } = useQuery({ queryKey: ["users"], queryFn: users.list });
  const canReassign = user && ["ADMIN", "MANAGER", "TEAM_LEAD"].includes(user.role);
  const canReview = user && ["ADMIN", "MANAGER"].includes(user.role);
  const { addToast } = useToastStore();

  const reassign = useMutation({
    mutationFn: ({ taskId, assigneeId }: { taskId: string; assigneeId: string }) => tasks.update(taskId, { assigneeId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project", id] }); queryClient.invalidateQueries({ queryKey: ["projects"] }); queryClient.invalidateQueries({ queryKey: ["overview"] }); addToast("Task reassigned!"); },
    onError: () => addToast("Failed to reassign task", "error"),
  });

  const logTime = useMutation({
    mutationFn: (data: { taskId: string; hours: number; description?: string }) => timeEntries.log(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["project", id] }); setLogTaskId(null); setLogHours(""); setLogDesc(""); setTimerLogDesc(""); addToast("Time logged!"); },
    onError: () => addToast("Failed to log time", "error"),
  });

  const review = useMutation({
    mutationFn: (data: { taskId: string; score: number; comment?: string }) => tasks.review(data.taskId, { score: data.score, comment: data.comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      setReviewTaskId(null);
      setReviewScore(0);
      setReviewComment("");
      addToast("Review submitted!");
    },
    onError: () => addToast("Failed to submit review", "error"),
  });

  const otherUsers = (currentId: string) => userList?.filter((u: any) => u.id !== currentId && ["MEMBER", "TEAM_LEAD"].includes(u.role)) || [];

  if (isLoading) return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
  if (!project) return <div className="text-red-500 py-12 text-center">Project not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/projects" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </Link>
          <h1 className="page-title mt-0.5">{project.name}</h1>
          {project.description && <p className="text-surface-500 text-sm mt-0.5">{project.description}</p>}
        </div>
        <div className="flex gap-2">
          <Link to={`/projects/${id}/kanban`} className="btn-secondary">Kanban</Link>
          <Link to={`/projects/${id}/gantt`} className="btn-secondary">Gantt</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {["TODO", "IN_PROGRESS", "REVIEW", "PENDING_APPROVAL", "DONE"].map((status) => (
          <div key={status} className={`card p-4 border-t-4 ${statusBorders[status]}`}>
            <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center justify-between">
              {status.replace("_", " ")}
              <span className="badge-gray text-xs">{project.tasks?.filter((t: any) => t.status === status).length || 0}</span>
            </h3>
            <div className="space-y-2.5">
              {project.tasks?.filter((t: any) => t.status === status).map((task: any) => {
                const r = calcRisk(task);
                return (
                  <div key={task.id} className="bg-surface-50 rounded-lg p-3 border border-surface-200">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-surface-800 flex-1">{task.title}</p>
                      <span className={statusBadges[task.status]}>{task.priority}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
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
                      {task.reviewScore && (
                        <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                          {task.reviewScore}/10
                        </span>
                      )}
                      {task.assignee && (
                        <span className="text-xs text-surface-500 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {task.assignee.name}
                        </span>
                      )}
                    </div>
                    {canReassign && (
                      <select
                        className="text-xs w-full rounded-lg border border-surface-200 px-2 py-1.5 mt-1.5 text-surface-500 bg-white outline-none focus:border-brand-400"
                        value={task.assigneeId || ""}
                        onChange={(e) => { const v = e.target.value; if (v && v !== task.assigneeId) reassign.mutate({ taskId: task.id, assigneeId: v }); }}
                      >
                        <option value="">{task.assignee ? "Reassign..." : "Assign to..."}</option>
                        {task.assignee && <option value={task.assigneeId}>{task.assignee.name}</option>}
                        {otherUsers(task.assigneeId || "").map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {(task.assigneeId === user?.id || canReassign) && (
                        <button onClick={() => { setLogTaskId(task.id); setLogHours(""); setLogDesc(""); }} className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          + Time
                        </button>
                      )}
                      {canReview && (
                        <button onClick={() => { setReviewTaskId(task.id); setReviewScore(task.reviewScore || 0); setReviewComment(task.reviewComment || ""); }} className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                          {task.reviewScore ? "Update Review" : "Review"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!project.tasks || project.tasks.filter((t: any) => t.status === status).length === 0) && (
                <p className="text-xs text-surface-300 text-center py-6">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {logTaskId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in" onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setTimerRunning(false); setTimerElapsed(0); setTimerLogDesc(""); setLogTaskId(null); }}>
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-surface-800 mb-4">Log Time</h3>
            <div className="mb-4">
              {timerRunning ? (
                <div className="flex items-center gap-3 bg-brand-50 rounded-xl px-4 py-3 border border-brand-200 mb-4">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-lg font-mono font-bold text-brand-700 tabular-nums">{formatTime(timerElapsed)}</span>
                  <span className="text-xs text-surface-400">tracking</span>
                </div>
              ) : (
                <input type="number" min="0.25" step="0.25" placeholder="Hours" className="input w-full mb-0" value={logHours} onChange={(e) => setLogHours(e.target.value)} autoFocus />
              )}
            </div>
            <input type="text" placeholder="Description (optional)" className="input w-full mb-4" value={timerRunning ? timerLogDesc : logDesc} onChange={(e) => { if (timerRunning) setTimerLogDesc(e.target.value); else setLogDesc(e.target.value); }} />
            <div className="flex gap-2 mb-3">
              {timerRunning ? (
                <button className="btn-primary flex-1" onClick={() => { const seconds = timerElapsed; const hours = Math.round((seconds / 3600) * 100) / 100; if (timerRef.current) clearInterval(timerRef.current); setTimerRunning(false); setTimerElapsed(0); if (hours >= 0.02) logTime.mutate({ taskId: logTaskId, hours, description: timerLogDesc || undefined }); }} disabled={logTime.isPending}>
                  {logTime.isPending ? "Saving..." : "Stop & Save"}
                </button>
              ) : (
                <>
                  <button className="btn-primary flex-1" onClick={() => { const h = parseFloat(logHours); if (h > 0) logTime.mutate({ taskId: logTaskId, hours: h, description: logDesc }); }} disabled={!logHours || parseFloat(logHours) <= 0 || logTime.isPending}>
                    {logTime.isPending ? "Saving..." : "Save"}
                  </button>
                  <button className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5" onClick={() => { setTimerRunning(true); setTimerElapsed(0); timerRef.current = setInterval(() => { setTimerElapsed((prev) => prev + 1); }, 1000); }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Timer
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {!timerRunning && <button className="btn-secondary flex-1" onClick={() => setLogTaskId(null)}>Cancel</button>}
              {timerRunning && <button className="btn-secondary flex-1" onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setTimerRunning(false); setTimerElapsed(0); setTimerLogDesc(""); }}>Cancel Timer</button>}
            </div>
          </div>
        </div>
      )}

      {reviewTaskId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in" onClick={() => setReviewTaskId(null)}>
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-surface-800 mb-1">Review Task</h3>
            <p className="text-sm text-surface-500 mb-4">Rate this task on a scale of 1–10</p>

            <div className="flex items-center justify-between gap-1 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setReviewScore(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${
                    reviewScore === n
                      ? "bg-purple-600 text-white shadow-md scale-110"
                      : "bg-surface-100 text-surface-500 hover:bg-surface-200"
                  }`}
                >{n}</button>
              ))}
            </div>

            <textarea
              placeholder="Comment (optional)"
              className="input w-full mb-5 resize-none"
              rows={3}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                className="btn-primary flex-1"
                onClick={() => review.mutate({ taskId: reviewTaskId, score: reviewScore, comment: reviewComment })}
                disabled={!reviewScore || reviewScore < 1 || review.isPending}
              >
                {review.isPending ? "Saving..." : "Submit Review"}
              </button>
              <button className="btn-secondary flex-1" onClick={() => setReviewTaskId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

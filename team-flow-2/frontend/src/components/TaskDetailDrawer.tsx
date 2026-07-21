import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasks, users, timeEntries } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import Avatar from "./Avatar";
import FileAttachments from "./FileAttachments";

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "REVIEW", "PENDING_APPROVAL", "DONE"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TaskDetailDrawer({ task, onClose }: { task: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [newStatus, setNewStatus] = useState(task.status);
  const [newPriority, setNewPriority] = useState(task.priority);
  const [newAssigneeId, setNewAssigneeId] = useState(task.assigneeId || "");
  const [logDesc, setLogDesc] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [reviewScore, setReviewScore] = useState(task.reviewScore || 5);
  const [reviewComment, setReviewComment] = useState(task.reviewComment || "");
  const [approvalComment, setApprovalComment] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const TIMER_KEY = `timer:${task.id}`;

  const { data: userList } = useQuery({ queryKey: ["users"], queryFn: users.list });
  const { data: taskTimeEntries } = useQuery({
    queryKey: ["timeEntries", "task", task.id],
    queryFn: () => timeEntries.byTask(task.id),
  });

  const canEdit = user && ["ADMIN", "MANAGER", "TEAM_LEAD"].includes(user.role);
  const canReview = user && ["ADMIN", "MANAGER"].includes(user.role);

  const updateTask = useMutation({
    mutationFn: (data: any) => tasks.update(task.id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      addToast("Task updated!");
      if (variables.status === "DONE" || variables.status === "PENDING_APPROVAL") {
        import("../utils/confetti").then((m) => m.fireConfetti());
      }
    },
    onError: () => addToast("Failed to update task", "error"),
  });

  const logTime = useMutation({
    mutationFn: (data: { taskId: string; hours: number; description?: string; date?: string }) => timeEntries.log(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries", "task", task.id] });
      setLogDesc(""); setLogDate(new Date().toISOString().split("T")[0]);
      addToast("Time logged!");
    },
    onError: () => addToast("Failed to log time", "error"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ score, comment }: { score: number; comment?: string }) => tasks.review(task.id, { score, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      addToast("Review submitted!");
    },
    onError: () => addToast("Failed to submit review", "error"),
  });

  const deleteTask = useMutation({
    mutationFn: () => tasks.delete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      addToast("Task deleted!");
      onClose();
    },
    onError: () => addToast("Failed to delete task", "error"),
  });

  const totalLogged = taskTimeEntries?.reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0) || 0;
  const otherUsers = userList?.filter((u: any) => u.id !== task.assigneeId) || [];

  const startTimer = () => {
    const now = Date.now();
    localStorage.setItem(TIMER_KEY, String(now));
    localStorage.setItem(`${TIMER_KEY}:desc`, logDesc);
    setTimerRunning(true);
    setTimerElapsed(0);
    timerRef.current = setInterval(() => {
      setTimerElapsed(Math.floor((Date.now() - now) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const seconds = timerElapsed;
    const hours = Math.round((seconds / 3600) * 100) / 100;
    localStorage.removeItem(TIMER_KEY);
    localStorage.removeItem(`${TIMER_KEY}:desc`);
    setTimerRunning(false);
    setTimerElapsed(0);
    if (hours >= 0.02) {
      logTime.mutate({ taskId: task.id, hours, description: logDesc || undefined, date: logDate });
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(TIMER_KEY);
    if (saved) {
      const savedStart = parseInt(saved, 10);
      const elapsed = Math.floor((Date.now() - savedStart) / 1000);
      setTimerElapsed(elapsed);
      setTimerRunning(true);
      const savedDesc = localStorage.getItem(`${TIMER_KEY}:desc`) || "";
      setLogDesc(savedDesc);
      timerRef.current = setInterval(() => {
        setTimerElapsed(Math.floor((Date.now() - savedStart) / 1000));
      }, 1000);
    }
    const handleVisibility = () => {
      if (document.hidden && timerRunning) {
        const savedStart = localStorage.getItem(TIMER_KEY);
        if (savedStart) {
          const elapsed = Math.floor((Date.now() - parseInt(savedStart, 10)) / 1000);
          setTimerElapsed(elapsed);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [TIMER_KEY]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" />
      <div className="relative w-full max-w-lg bg-white shadow-2xl animate-slide-in-right overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium shrink-0 ${
              task.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
              task.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
              task.status === "REVIEW" ? "bg-amber-100 text-amber-700" :
              task.status === "PENDING_APPROVAL" ? "bg-purple-100 text-purple-700" :
              "bg-surface-100 text-surface-600"
            }`}>
              {task.status === "IN_PROGRESS" ? "In Progress" : task.status === "PENDING_APPROVAL" ? "Pending Approval" : task.status === "TODO" ? "To Do" : task.status}
            </span>
            <h2 className="text-lg font-semibold text-surface-800 truncate">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-50 rounded-xl p-3.5">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider font-medium">Project</p>
              <p className="text-sm font-semibold text-surface-800 mt-1">{task.project?.name || "—"}</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-3.5">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider font-medium">Assignee</p>
              <p className="text-sm font-semibold text-surface-800 mt-1 flex items-center gap-2">
                {task.assignee ? <><Avatar name={task.assignee.name} size="sm" />{task.assignee.name}</> : "Unassigned"}
              </p>
            </div>
            <div className="bg-surface-50 rounded-xl p-3.5">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider font-medium">Deadline</p>
              <p className="text-sm font-semibold text-surface-800 mt-1">{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-3.5">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider font-medium">Priority</p>
              <p className="text-sm font-semibold mt-1">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                  task.priority === "CRITICAL" || task.priority === "HIGH" ? "bg-red-100 text-red-700" :
                  task.priority === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                  "bg-surface-100 text-surface-500"
                }`}>{task.priority}</span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Description</h3>
            <p className="text-sm text-surface-700">{task.description || "No description"}</p>
          </div>

          <FileAttachments taskId={task.id} />

          {canEdit && (
            <div className="border-t border-surface-200 pt-5">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Edit Task</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-surface-500 mb-1">Status</label>
                  <select value={newStatus} onChange={(e) => { setNewStatus(e.target.value); updateTask.mutate({ status: e.target.value }); }} className="input text-sm w-full">
                    {(canReview ? STATUS_OPTIONS : STATUS_OPTIONS.filter((s) => s !== "DONE")).map((s) => <option key={s} value={s}>{s === "IN_PROGRESS" ? "In Progress" : s === "PENDING_APPROVAL" ? "Pending Approval" : s === "TODO" ? "To Do" : s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-surface-500 mb-1">Priority</label>
                  <select value={newPriority} onChange={(e) => { setNewPriority(e.target.value); updateTask.mutate({ priority: e.target.value }); }} className="input text-sm w-full">
                    {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-surface-500 mb-1">Reassign</label>
                  <select value={newAssigneeId} onChange={(e) => { const v = e.target.value; setNewAssigneeId(v); if (v) updateTask.mutate({ assigneeId: v }); }} className="input text-sm w-full">
                    <option value="">Current: {task.assignee?.name || "Unassigned"}</option>
                    {otherUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {canReview && task.status === "PENDING_APPROVAL" && (
            <div className="border-t border-surface-200 pt-5">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Approval</h3>
              <div className="flex items-center gap-2 mb-3">
                <input type="text" placeholder="Comment (optional)" className="input text-sm flex-1" value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { updateTask.mutate({ status: "DONE", reviewComment: approvalComment || undefined }); }}
                  disabled={updateTask.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {updateTask.isPending ? "..." : "Approve"}
                </button>
                <button
                  onClick={() => { updateTask.mutate({ status: "IN_PROGRESS", reviewComment: approvalComment || undefined }); }}
                  disabled={updateTask.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  {updateTask.isPending ? "..." : "Reject"}
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-surface-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Time Logged</h3>
              <span className="text-xs font-medium text-surface-600">{totalLogged.toFixed(1)}h total</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input type="text" placeholder="What are you working on?" className="input text-sm flex-1" value={logDesc} onChange={(e) => { setLogDesc(e.target.value); if (timerRunning) localStorage.setItem(`${TIMER_KEY}:desc`, e.target.value); }} />
              <input type="date" className="input text-sm w-36" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              {timerRunning ? (
                <>
                  <div className="flex-1 flex items-center gap-3 bg-brand-50 rounded-xl px-4 py-2.5 border border-brand-200">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-lg font-mono font-bold text-brand-700 tabular-nums">{formatTime(timerElapsed)}</span>
                    <span className="text-xs text-surface-400">tracking</span>
                  </div>
                  <button onClick={stopTimer} disabled={logTime.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                    {logTime.isPending ? "Saving..." : "Stop"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={startTimer}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Start Timer
                  </button>
                </>
              )}
            </div>
            {taskTimeEntries && taskTimeEntries.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {taskTimeEntries.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {e.user && <Avatar name={e.user.name} size="sm" />}
                      <span className="text-xs font-medium text-surface-700">{e.user?.name || "Unknown"}</span>
                      <span className="text-xs text-surface-400">{e.description || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-surface-700">{Number(e.hours).toFixed(1)}h</span>
                      <span className="text-[10px] text-surface-400">{(e.date || "").split("T")[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canReview && (
            <div className="border-t border-surface-200 pt-5">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Review</h3>
              <div className="flex items-center gap-1.5 mb-3">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <button key={n} onClick={() => setReviewScore(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      n <= reviewScore ? "bg-amber-400 text-white shadow-sm" : "bg-surface-100 text-surface-400 hover:bg-surface-200"
                    }`}>{n}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <input type="text" placeholder="Comment (optional)" className="input text-sm w-full" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                </div>
                <button onClick={() => reviewMutation.mutate({ score: reviewScore, comment: reviewComment || undefined })} disabled={reviewMutation.isPending}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                  {reviewMutation.isPending ? "..." : "Submit"}
                </button>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="border-t border-surface-200 pt-5">
              <button onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(); }}
                className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                disabled={deleteTask.isPending}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {deleteTask.isPending ? "Deleting..." : "Delete Task"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

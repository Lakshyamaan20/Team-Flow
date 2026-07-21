import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projects, tasks, users } from "../services/api";
import { useToastStore } from "../store/toastStore";
import { useAuthStore } from "../store/authStore";

function TaskForm({ title, assigneeLabel, assigneeOptions, onSuccess }: {
  title: string;
  assigneeLabel: string;
  assigneeOptions: any[];
  onSuccess: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projectData } = useQuery({ queryKey: ["projects"], queryFn: projects.list });
  const { addToast } = useToastStore();
  const firstProject = projectData?.[0];

  const [taskTitle, setTaskTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);

  const createTask = useMutation({
    mutationFn: tasks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["productivity"] });
      addToast("Task assigned successfully!");
      onSuccess();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error || err?.message || "Failed to assign task");
      addToast("Failed to assign task", "error");
    },
  });

  const handlePredict = async () => {
    setPredicting(true);
    try {
      const res = await tasks.predictDeadline({ estimatedHours: 0, priority });
      setPrediction(res);
    } catch {
      addToast("Failed to predict deadline", "error");
    } finally {
      setPredicting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !assigneeId || !firstProject) return;
    const dueDate = deadlineDays ? new Date(Date.now() + parseInt(deadlineDays) * 86400000).toISOString() : undefined;
    createTask.mutate({ title: taskTitle, projectId: firstProject.id, assigneeId, dueDate, estimatedHours: 8, priority, comment: comment.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1.5">Task title</label>
        <input className="input-white" placeholder='e.g. "Design the login page"' value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1.5">{assigneeLabel}</label>
        <select className="input-white" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required>
          <option value="">Select...</option>
          {assigneeOptions.map((u: any) => <option key={u.id} value={u.id}>{u.name} {u.department ? `(${u.department.name})` : ""}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1.5">Priority</label>
        <select className="input-white" value={priority} onChange={(e) => { setPriority(e.target.value); setPrediction(null); }}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-surface-300">Deadline (days)</label>
          <button type="button" onClick={handlePredict} disabled={predicting}
            className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
            {predicting ? <>Predicting...</> : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Predict deadline</>}
          </button>
        </div>
        <input type="number" min="1" max="365" className="input-white" placeholder="e.g. 7" value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)} />
      </div>
      {prediction && (
        <div className="bg-brand-500/10 border border-brand-500/25 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <span className="text-sm font-semibold text-brand-300">Suggested Deadline</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${prediction.confidence === "HIGH" ? "bg-emerald-500/20 text-emerald-400" : prediction.confidence === "LOW" ? "bg-amber-500/20 text-amber-400" : "bg-sky-500/20 text-sky-400"}`}>{prediction.confidence} confidence</span>
            </div>
            <button type="button" onClick={() => { setDeadlineDays(String(prediction.predictedDays)); setPrediction(null); }}
              className="text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg transition-colors">Apply</button>
          </div>
          <p className="text-sm text-surface-300"><span className="text-white font-semibold">{prediction.predictedDays} day{prediction.predictedDays > 1 ? "s" : ""}</span> → {new Date(prediction.predictedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-surface-300 mb-1.5">Comment (optional)</label>
        <textarea className="input-white resize-none" rows={3} placeholder="Add a note for the assignee..." value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      {firstProject && <p className="text-xs text-surface-400">Project: <span className="text-surface-300 font-medium">{firstProject.name}</span></p>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-2.5">{error}</div>}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" className="bg-white text-surface-800 font-semibold px-6 py-2.5 rounded-xl hover:bg-surface-100 transition-all disabled:opacity-50 text-sm" disabled={createTask.isPending}>
          {createTask.isPending ? "Assigning..." : "Assign"}
        </button>
      </div>
    </form>
  );
}

export default function AssignTask() {
  const navigate = useNavigate();
  const { data: projectData } = useQuery({ queryKey: ["projects"], queryFn: projects.list });
  const { data: userList } = useQuery({ queryKey: ["users"], queryFn: users.list });
  const firstProject = projectData?.[0];

  const managers = userList?.filter((u: any) => u.role === "MANAGER") || [];
  const members = userList?.filter((u: any) => u.role === "MEMBER" || u.role === "TEAM_LEAD") || [];
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Assign a Task</h1>
          <p className="page-subtitle">Assign tasks to managers or team members</p>
        </div>
        <button type="button" onClick={() => navigate("/")} className="text-sm text-surface-400 hover:text-surface-300 transition-colors">Cancel</button>
      </div>

      {!firstProject ? (
        <div className="card py-12 text-center text-surface-400 text-sm">No projects available. Create a project first.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 max-w-3xl">
          <div className="bg-surface-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{isAdmin ? "Assign to Manager" : "Assign to Member"}</h2>
                  <p className="text-xs text-surface-400">{isAdmin ? "Delegate tasks to project managers" : "Assign work to individual members"}</p>
                </div>
              </div>
              <TaskForm title={isAdmin ? "manager" : "member"} assigneeLabel={isAdmin ? "Select manager" : "Select member"} assigneeOptions={isAdmin ? managers : members} onSuccess={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
}

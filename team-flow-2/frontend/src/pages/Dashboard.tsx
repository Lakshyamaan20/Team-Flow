import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { projects, reports, tasks } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { SkeletonChart } from "../components/Skeleton";
import WeekInReview from "../components/WeekInReview";
import Avatar from "../components/Avatar";
import AnimatedNumber from "../components/AnimatedNumber";

export default function Dashboard() {
  const { user } = useAuthStore();

  const { data: projectData } = useQuery({ queryKey: ["projects"], queryFn: projects.list });
  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: reports.overview });
  const { data: reportData } = useQuery({
    queryKey: ["productivity", user?.id],
    queryFn: () => reports.productivity(user!.id),
    enabled: !!user?.id,
  });
  const { data: allTasks } = useQuery({
    queryKey: ["allTasks"],
    queryFn: tasks.all,
    enabled: user?.role === "MANAGER" || user?.role === "ADMIN",
  });

  const totalTasks = overview?.totalTasks || projectData?.reduce((sum: number, p: any) => sum + (p._count?.tasks || 0), 0) || 0;
  const pendingApprovals = allTasks?.filter((t: any) => t.status === "PENDING_APPROVAL").length || 0;

  const [clock, setClock] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date());
      setLastUpdated((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={user?.name} size="lg" />
        <div className="flex-1">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name} ({user?.email?.split('@')[0]?.toUpperCase()})</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-surface-400">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{clock.toLocaleTimeString()}</span>
          </div>
          <span className="text-surface-600">·</span>
          <span>Updated {lastUpdated}s ago</span>
        </div>
      </div>

      <div data-tour="summary" className="stagger-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 shadow-xl shadow-brand-600/20 px-6 py-5" style={{ animationDelay: "0ms" }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-xl" />
          <div className="relative flex items-center justify-around">
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-white"><AnimatedNumber value={projectData?.length || 0} /></p>
            <p className="text-xs text-white/70 font-semibold uppercase tracking-widest mt-0.5">Projects</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-white"><AnimatedNumber value={totalTasks} /></p>
            <p className="text-xs text-white/70 font-semibold uppercase tracking-widest mt-0.5">Tasks</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-white"><AnimatedNumber value={overview?.completedTasks || reportData?.completedTasks || 0} /></p>
            <p className="text-xs text-white/70 font-semibold uppercase tracking-widest mt-0.5">Done</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-white"><AnimatedNumber value={overview?.onTimePercent ?? reportData?.onTimePercent ?? 0} />%</p>
            <p className="text-xs text-white/70 font-semibold uppercase tracking-widest mt-0.5">On-Time</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-white"><AnimatedNumber value={overview?.overdueTasks || 0} /></p>
            <p className="text-xs text-white/70 font-semibold uppercase tracking-widest mt-0.5">Overdue</p>
          </div>
        </div>
      </div>

      {(user?.role === "MANAGER" || user?.role === "ADMIN") && pendingApprovals > 0 && (
        <Link to="/my-tasks" className="stagger-fade-in block rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-xl shadow-purple-600/20 p-5 hover:shadow-purple-600/30 transition-shadow" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-purple-200 text-xs uppercase tracking-wider font-medium">Pending Approval</p>
              <p className="text-white text-xl font-bold">{pendingApprovals} task{pendingApprovals > 1 ? "s" : ""} awaiting your review</p>
            </div>
            <svg className="w-5 h-5 text-purple-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      <div className="stagger-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 shadow-xl shadow-brand-600/20 p-6 md:p-8" style={{ animationDelay: "200ms" }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-xl" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-400/10 rounded-full blur-lg" />

        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg ring-1 ring-white/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">AI Insight</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-white/90 text-lg font-medium leading-relaxed">
              {overview
                ? overview.pendingTasks > 0
                  ? `${overview.pendingTasks} task${overview.pendingTasks > 1 ? "s" : ""} still pending across all projects. ${overview.completedTasks} completed — that's ${overview.totalTasks ? Math.round((overview.completedTasks / overview.totalTasks) * 100) : 0}% done. Keep pushing!`
                  : "All tasks completed across every project. Outstanding work this week!"
                : <div className="space-y-2"><div className="h-4 w-full rounded-md bg-white/10 animate-pulse" /><div className="h-4 w-3/4 rounded-md bg-white/10 animate-pulse" /></div>}
            </p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70 text-xs uppercase tracking-wider">Completion</span>
                <span className="text-white font-bold">{overview && overview.totalTasks ? Math.round((overview.completedTasks / overview.totalTasks) * 100) : 0}%</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70 text-xs uppercase tracking-wider">Pending</span>
                <span className="text-white font-bold">{overview?.pendingTasks || 0}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/70 text-xs uppercase tracking-wider">Projects</span>
                <span className="text-white font-bold">{projectData?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(user?.role === "MANAGER" || user?.role === "ADMIN") && <div className="stagger-fade-in" style={{ animationDelay: "300ms" }}><WeekInReview /></div>}

      <div data-tour="cards" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card stagger-fade-in" style={{ animationDelay: "400ms" }}>
          <h2 className="section-title mb-4">Task Status</h2>
          {overview?.tasksByStatus ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={Object.entries(overview.tasksByStatus).map(([k, v]) => ({ name: { TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", PENDING_APPROVAL: "Approval", DONE: "Done" }[k] || k, count: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)" }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <SkeletonChart />
          )}
        </div>

        <div className="card stagger-fade-in" style={{ animationDelay: "500ms" }}>
          <h2 className="section-title mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/assign" className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-200 hover:bg-brand-50 hover:border-brand-200 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-800 group-hover:text-brand-700 transition-colors">Assign New Task</p>
                <p className="text-xs text-surface-500">Create and delegate a task to a team member</p>
              </div>
              <svg className="w-5 h-5 text-surface-400 ml-auto group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/my-tasks" className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-200 hover:bg-brand-50 hover:border-brand-200 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-800 group-hover:text-sky-700 transition-colors">My Tasks</p>
                <p className="text-xs text-surface-500">View all your assigned tasks</p>
              </div>
              <svg className="w-5 h-5 text-surface-400 ml-auto group-hover:text-sky-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/projects" className="flex items-center gap-3 p-4 rounded-xl bg-surface-50 border border-surface-200 hover:bg-brand-50 hover:border-brand-200 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-800 group-hover:text-amber-700 transition-colors">View Projects</p>
                <p className="text-xs text-surface-500">Browse all projects and their progress</p>
              </div>
              <svg className="w-5 h-5 text-surface-400 ml-auto group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

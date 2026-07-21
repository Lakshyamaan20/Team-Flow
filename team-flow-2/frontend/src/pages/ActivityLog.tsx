import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { activityLogs, timeEntries } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Avatar from "../components/Avatar";

const actionIcons: Record<string, string> = {
  status_change: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
};

const actionLabels: Record<string, string> = {
  status_change: "Status Change",
  task_reviewed: "Task Reviewed",
  task_created: "Task Created",
  task_updated: "Task Updated",
  task_deleted: "Task Deleted",
  task_approved: "Task Approved",
  task_rejected: "Task Rejected",
};

export default function ActivityLog() {
  const { user } = useAuthStore();
  const { data: logs } = useQuery({ queryKey: ["activityLogs"], queryFn: activityLogs.list });
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const uniqueActions = useMemo(() => logs ? [...new Set(logs.map((l: any) => l.action))].sort() : [], [logs]);
  const uniqueUsers = useMemo(() => {
    if (!logs) return [];
    const map = new Map();
    logs.forEach((l: any) => { if (l.user) map.set(l.user.id, l.user.name); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l: any) => {
      const dateKey = (l.createdAt || "").split("T")[0].split(" ")[0];
      if (selectedDate && dateKey !== selectedDate) return false;
      if (filterAction && l.action !== filterAction) return false;
      if (filterUser && l.user?.id !== filterUser) return false;
      if (filterFrom && dateKey < filterFrom) return false;
      if (filterTo && dateKey > filterTo) return false;
      return true;
    });
  }, [logs, selectedDate, filterAction, filterUser, filterFrom, filterTo]);

  const today = new Date();

  const { data: timeData } = useQuery({
    queryKey: ["myTimeEntries", user?.id],
    queryFn: () => timeEntries.byUser(user!.id),
    enabled: !!user?.id,
  });

  const dailyHours = [];
  if (timeData && timeData.length > 0) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayEntries = timeData.filter((e: any) => {
        const entryDate = e.date ? e.date.split("T")[0].trim() : "";
        return entryDate === key;
      });
      const total = dayEntries.reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);
      dailyHours.push({ name: d.toLocaleDateString("en-US", { weekday: "short" }), hours: Math.round(total * 100) / 100, date: key });
    }
  }
  const todayHours = dailyHours.find((d) => d.date === today.toISOString().split("T")[0])?.hours || 0;
  const weekTotal = dailyHours.reduce((sum, d) => sum + d.hours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Activity Log</h1>
        <p className="page-subtitle">Track all changes and actions across the system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="p-5 border-b border-surface-100">
            <h2 className="text-sm font-semibold text-surface-800">Audit Trail</h2>
          </div>
          {logs && logs.length > 0 && (
            <>
            <div className="px-5 py-3 border-b border-surface-100 flex items-center gap-1.5 overflow-x-auto">
              <button onClick={() => setSelectedDate("")} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${!selectedDate ? "bg-surface-800 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>All</button>
              {[...new Set(logs.map((l: any) => (l.createdAt || "").split("T")[0].split(" ")[0]))].sort((a: string, b: string) => b.localeCompare(a)).map((dateKey: string) => {
                const d = new Date(dateKey);
                const label = d.toDateString() === new Date().toDateString() ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
                return (
                  <button key={dateKey} onClick={() => setSelectedDate(dateKey)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedDate === dateKey ? "bg-surface-800 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>{label}</button>
                );
              })}
            </div>
            <div className="px-5 py-2.5 border-b border-surface-100 flex items-center gap-2 flex-wrap bg-surface-50/50">
              <select className="input text-xs w-32 py-1.5" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                <option value="">All Actions</option>
                {uniqueActions.map((a) => <option key={a} value={a}>{actionLabels[a] || a.replace(/_/g, " ")}</option>)}
              </select>
              <select className="input text-xs w-36 py-1.5" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                <option value="">All Users</option>
                {uniqueUsers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <input type="date" className="input text-xs py-1.5 w-36" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} placeholder="From" />
              <input type="date" className="input text-xs py-1.5 w-36" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} placeholder="To" />
              {(filterAction || filterUser || filterFrom || filterTo) && (
                <button onClick={() => { setFilterAction(""); setFilterUser(""); setFilterFrom(""); setFilterTo(""); }} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Clear</button>
              )}
            </div>
            </>
          )}
          {!logs || logs.length === 0 ? (
            <div className="p-12 text-center text-surface-400 text-sm">No activity recorded yet</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-surface-400 text-sm">No activity matches your filters</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {filteredLogs.map((l: any) => (
                <div key={l.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-surface-50/50 transition-colors">
                  <Avatar name={l.user?.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-surface-800">{l.user?.name || "Unknown"}</span>
                      <span className="text-xs text-surface-400">{l.action.replace(/_/g, " ")}</span>
                      {l.task && (
                        <>
                          <span className="text-surface-300">—</span>
                          <span className="text-sm text-surface-600 truncate">{l.task.title}</span>
                          {l.task.project && (
                            <span className="text-xs text-surface-400">in {l.task.project.name}</span>
                          )}
                        </>
                      )}
                    </div>
                    {l.details && <p className="text-xs text-surface-500 mt-0.5">{l.details}</p>}
                    <p className="text-[11px] text-surface-400 mt-1">
                      {new Date(l.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title mb-4">My Hours</h2>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-surface-100 gap-0">
            <div className="text-center flex-1">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">Today</p>
              <p className="text-base font-bold text-surface-800">{todayHours}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">Week</p>
              <p className="text-base font-bold text-surface-800">{weekTotal}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">Avg</p>
              <p className="text-base font-bold text-surface-800">{(weekTotal / 7).toFixed(1)}</p>
            </div>
          </div>
          {dailyHours.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(v: number) => [`${v}h`, "Hours"]} />
                <Bar dataKey="hours" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-surface-400 text-sm">No hours logged yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

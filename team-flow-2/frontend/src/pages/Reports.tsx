import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reports, departments, timeEntries } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { SkeletonChart } from "../components/Skeleton";
import { downloadCSV, downloadPDF } from "../utils/export";

const PIE_COLORS = ["#6366f1", "#3b82f6", "#eab308", "#22c55e"];

export default function Reports() {
  const { user } = useAuthStore();
  const [selectedDept, setSelectedDept] = useState<string>(user?.departmentId || "");
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const [timeStart, setTimeStart] = useState(weekAgo);
  const [timeEnd, setTimeEnd] = useState(today);

  const { data: report } = useQuery({ queryKey: ["productivity", user?.id], queryFn: () => reports.productivity(user!.id), enabled: !!user?.id });
  const { data: deptList } = useQuery({ queryKey: ["departments"], queryFn: departments.list });
  const { data: teamReport } = useQuery({ queryKey: ["team-report", selectedDept], queryFn: () => reports.team(selectedDept), enabled: !!selectedDept });
  const { data: timeReport } = useQuery({ queryKey: ["time-report", selectedDept, timeStart, timeEnd], queryFn: () => timeEntries.byTeam(selectedDept, timeStart, timeEnd), enabled: !!selectedDept });

  const statusData = report?.tasksByStatus ? Object.entries(report.tasksByStatus).map(([k, v]) => ({ name: k.replace("_", " "), value: v })) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Track productivity and time across teams</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title mb-0">Personal Productivity</h2>
            {report && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => downloadCSV(
                  [{ Metric: "Total Tasks", Value: report.totalTasks }, { Metric: "Completed", Value: report.completedTasks }, { Metric: "Pending", Value: report.pendingTasks }, { Metric: "On-Time", Value: `${report.onTimePercent}%` }, { Metric: "Weekly Velocity", Value: report.weeklyVelocity }],
                  "productivity-summary"
                )} className="text-xs font-medium text-surface-500 hover:text-brand-600 bg-surface-100 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  CSV
                </button>
                <button onClick={() => downloadPDF(
                  "Productivity Report",
                  ["Metric", "Value"],
                  [["Total Tasks", String(report.totalTasks)], ["Completed", String(report.completedTasks)], ["Pending", String(report.pendingTasks)], ["On-Time", `${report.onTimePercent}%`], ["Weekly Velocity", String(report.weeklyVelocity)]],
                  "productivity-report"
                )} className="text-xs font-medium text-surface-500 hover:text-brand-600 bg-surface-100 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  PDF
                </button>
              </div>
            )}
          </div>
          {report ? (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-surface-50 rounded-xl p-4"><p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Total</p><p className="text-2xl font-bold text-surface-800 mt-1">{report.totalTasks}</p></div>
              <div className="bg-emerald-50 rounded-xl p-4"><p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Done</p><p className="text-2xl font-bold text-emerald-700 mt-1">{report.completedTasks}</p></div>
              <div className="bg-brand-50 rounded-xl p-4"><p className="text-xs font-medium text-brand-600 uppercase tracking-wider">On-Time</p><p className="text-2xl font-bold text-brand-700 mt-1">{report.onTimePercent}%</p></div>
            </div>
          ) : <div className="space-y-3 py-6"><div className="grid grid-cols-3 gap-3"><div className="bg-surface-50 rounded-xl p-4"><div className="h-3 w-12 rounded bg-surface-200 animate-pulse mb-2" /><div className="h-7 w-16 rounded bg-surface-200 animate-pulse" /></div><div className="bg-surface-50 rounded-xl p-4"><div className="h-3 w-12 rounded bg-surface-200 animate-pulse mb-2" /><div className="h-7 w-16 rounded bg-surface-200 animate-pulse" /></div><div className="bg-surface-50 rounded-xl p-4"><div className="h-3 w-12 rounded bg-surface-200 animate-pulse mb-2" /><div className="h-7 w-16 rounded bg-surface-200 animate-pulse" /></div></div><SkeletonChart /></div>}
          {statusData.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                {statusData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
              </Pie><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} /></PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title mb-0">Team</h2>
            {teamReport && Array.isArray(teamReport) && teamReport.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => downloadCSV(teamReport, "team-report")} className="text-xs font-medium text-surface-500 hover:text-brand-600 bg-surface-100 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  CSV
                </button>
                <button onClick={() => {
                  const rows = teamReport.map((m: any) => [m.name, String(m.totalTasks), String(m.completedTasks), String(m.pendingTasks)]);
                  downloadPDF("Team Report", ["Member", "Total Tasks", "Completed", "Pending"], rows, "team-report");
                }} className="text-xs font-medium text-surface-500 hover:text-brand-600 bg-surface-100 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  PDF
                </button>
              </div>
            )}
          </div>
          <select className="input mb-4" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
            <option value="">Select team...</option>
            {deptList?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {!teamReport ? <p className="text-surface-400 text-sm py-12 text-center">Select a team</p>
          : !Array.isArray(teamReport) || teamReport.length === 0 ? <p className="text-surface-400 text-sm py-12 text-center">No members</p>
          : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamReport}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="completedTasks" name="Done" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Bar dataKey="pendingTasks" name="Pending" fill="#eab308" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {selectedDept && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title mb-0">Time Tracking</h2>
            {timeReport && Array.isArray(timeReport) && timeReport.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => downloadCSV(timeReport.map((m: any) => ({ Name: m.name, Hours: m.totalHours.toFixed(1), Entries: m.entryCount })), "time-tracking")} className="text-xs font-medium text-surface-500 hover:text-brand-600 bg-surface-100 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  CSV
                </button>
                <button onClick={() => {
                  const rows = timeReport.map((m: any) => [m.name, m.totalHours.toFixed(1), String(m.entryCount)]);
                  downloadPDF("Time Tracking Report", ["Member", "Hours", "Entries"], rows, "time-tracking");
                }} className="text-xs font-medium text-surface-500 hover:text-brand-600 bg-surface-100 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  PDF
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div><label className="text-xs font-medium text-surface-500 block mb-1">From</label><input type="date" className="input" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} /></div>
            <div><label className="text-xs font-medium text-surface-500 block mb-1">To</label><input type="date" className="input" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} /></div>
          </div>
          {!timeReport ? <p className="text-surface-400 text-sm">Loading...</p>
          : !Array.isArray(timeReport) || timeReport.length === 0 ? <p className="text-surface-400 text-sm">No entries</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-surface-200">
                  <th className="table-header text-left py-3 pr-4">Member</th>
                  <th className="table-header text-right py-3 px-4">Hours</th>
                  <th className="table-header text-right py-3 pl-4">Entries</th>
                </tr></thead>
                <tbody>{timeReport.map((m: any) => (
                  <tr key={m.userId} className="border-b border-surface-100 last:border-0">
                    <td className="py-3 pr-4 text-surface-800 font-medium">{m.name}</td>
                    <td className="py-3 px-4 text-right font-semibold">{m.totalHours.toFixed(1)}</td>
                    <td className="py-3 pl-4 text-right text-surface-500">{m.entryCount}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tasks } from "../services/api";
import { Link } from "react-router-dom";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

  const { data: taskList } = useQuery({
    queryKey: ["allTasks"],
    queryFn: tasks.all,
  });

  const tasksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (!taskList) return map;
    for (const t of taskList) {
      if (!t.dueDate) continue;
      const key = t.dueDate.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [taskList]);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const cells: { day: number; dateStr: string; isToday: boolean; isOther: boolean }[] = [];
  for (let i = 0; i < startDay; i++) {
    cells.push({ day: 0, dateStr: "", isToday: false, isOther: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    cells.push({ day: d, dateStr, isToday, isOther: false });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: 0, dateStr: "", isToday: false, isOther: true });
  }

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Calendar</h1>
        <p className="page-subtitle">Tasks grouped by their due dates</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-xl font-bold text-surface-800 min-w-[200px] text-center">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</h2>
            <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <button onClick={() => setMonthOffset(0)} className="text-sm text-brand-600 hover:text-brand-700 font-medium">Today</button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-surface-200 rounded-xl overflow-hidden">
          {DAYS.map((d) => (
            <div key={d} className="bg-surface-50 text-center text-xs font-semibold text-surface-500 uppercase tracking-wider py-2">{d}</div>
          ))}
          {weeks.map((week, wi) => week.map((cell, ci) => (
            <div key={`${wi}-${ci}`} className={`min-h-[100px] bg-white p-2 ${cell.isOther ? "opacity-30" : ""}`}>
              {cell.day > 0 && (
                <>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 ${
                    cell.isToday ? "bg-brand-600 text-white" : "text-surface-600"
                  }`}>{cell.day}</span>
                  {tasksByDate[cell.dateStr] && (
                    <div className="space-y-1">
                      {tasksByDate[cell.dateStr].slice(0, 3).map((t: any) => (
                        <Link key={t.id} to={`/projects/${t.projectId}`}
                          className={`block text-[11px] leading-tight px-1.5 py-1 rounded truncate font-medium ${
                            t.status === "DONE" ? "bg-emerald-100 text-emerald-700" :
                            t.status === "REVIEW" ? "bg-amber-100 text-amber-700" :
                            t.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                            "bg-surface-100 text-surface-600"
                          }`}>
                          {t.title}
                        </Link>
                      ))}
                      {tasksByDate[cell.dateStr].length > 3 && (
                        <span className="text-[10px] text-surface-400 font-medium pl-1">+{tasksByDate[cell.dateStr].length - 3} more</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}

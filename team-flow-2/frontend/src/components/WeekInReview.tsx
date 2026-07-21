import { useQuery } from "@tanstack/react-query";
import { reports } from "../services/api";

function Arrow({ dir }: { dir: string }) {
  if (dir === "up") return <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>;
  if (dir === "down") return <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
  return <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" /></svg>;
}

export default function WeekInReview() {
  const { data, isLoading } = useQuery({
    queryKey: ["weekInReview"],
    queryFn: reports.weekInReview,
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 shadow-xl shadow-brand-600/20 p-6 md:p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 bg-white/10 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="space-y-2"><div className="h-8 w-16 bg-white/10 rounded" /><div className="h-3 w-20 bg-white/10 rounded" /></div>)}
        </div>
      </div>
    </div>
  );

  if (!data) return null;

  const items = [
    { label: "Created", value: data.createdThisWeek, prev: data.createdLastWeek, trend: data.createdTrend },
    { label: "Completed", value: data.completedThisWeek, prev: data.completedLastWeek, trend: data.completedTrend },
    { label: "Overdue", value: data.overdue, prev: null, trend: data.overdueTrend },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 shadow-xl shadow-brand-600/20 p-6 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-xl" />
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-400/10 rounded-full blur-lg" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg ring-1 ring-white/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Week in Review</h3>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-white/60 uppercase tracking-wider">vs previous week</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xl font-bold text-white">{item.value}</span>
                <Arrow dir={item.trend} />
              </div>
              <p className="text-xs text-white/70 font-medium uppercase tracking-wider">{item.label}</p>
              {item.prev !== null && (
                <p className="text-[10px] text-white/50 mt-0.5">
                  {item.prev} last week
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

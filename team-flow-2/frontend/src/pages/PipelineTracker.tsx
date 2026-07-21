import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const STAGE_COLORS: Record<string, string> = {
  completed: "bg-emerald-500",
  in_progress: "bg-blue-500",
  pending: "bg-surface-200",
  rejected: "bg-red-500",
};

const STAGE_BG: Record<string, string> = {
  completed: "border-emerald-500 bg-emerald-50",
  in_progress: "border-blue-500 bg-blue-50",
  pending: "border-surface-300 bg-white",
  rejected: "border-red-500 bg-red-50",
};

const STAGE_TEXT: Record<string, string> = {
  completed: "text-emerald-700",
  in_progress: "text-blue-700",
  pending: "text-surface-400",
  rejected: "text-red-700",
};

function formatCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function PipelineTracker() {
  const { data: pipeline, isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => api.get("/pipeline").then((r) => r.data),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Lead-to-Disbursement Tracker</h1>
        <p className="page-subtitle">Track loan applications from lead through disbursement</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-surface-200 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-surface-200 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex-1 h-10 rounded-lg bg-surface-200 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !pipeline || pipeline.length === 0 ? (
        <div className="card py-12 text-center text-surface-400 text-sm">No applications in pipeline.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-6 text-xs text-surface-500 px-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> In Progress</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-surface-200" /> Pending</span>
          </div>

          {pipeline.map((app: any) => {
            const activeIdx = app.stages.findIndex((s: any) => s.status === "in_progress");
            const completedCount = app.stages.filter((s: any) => s.status === "completed").length;
            const progress = Math.round((completedCount / app.stages.length) * 100);

            return (
              <div key={app.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                      {app.customerName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-800">{app.customerName}</h3>
                      <p className="text-xs text-surface-500">{app.loanType} — {formatCurrency(app.amount)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-surface-400">{app.id}</span>
                    <p className="text-xs text-surface-500 mt-0.5">{app.phone}</p>
                  </div>
                </div>

                <div className="relative mb-4">
                  <div className="w-full bg-surface-100 rounded-full h-2">
                    <div className="bg-gradient-to-r from-emerald-400 to-brand-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10px] text-surface-400 mt-1 block">{completedCount}/{app.stages.length} stages done</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {app.stages.map((stage: any, si: number) => (
                    <div key={stage.name} className={`rounded-lg border p-2.5 text-center transition-all ${STAGE_BG[stage.status]}`}>
                      <div className="flex items-center justify-center mb-1.5">
                        <div className={`w-3 h-3 rounded-full ${STAGE_COLORS[stage.status]} ${stage.status === "in_progress" ? "animate-pulse" : ""}`} />
                      </div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${STAGE_TEXT[stage.status]}`}>{stage.name}</p>
                      <p className="text-[10px] text-surface-400 mt-0.5">{stage.date || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

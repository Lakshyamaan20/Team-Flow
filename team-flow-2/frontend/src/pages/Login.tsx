import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent, presetEmpId?: string) => {
    if (e) e.preventDefault();
    const id = presetEmpId || empId.trim();
    const pw = presetEmpId ? "password123" : password.trim();
    if (!id || !pw) return;
    setLoading(true);
    setError("");
    try {
      const email = `${id.toLowerCase()}@finova.in`;
      const data = await auth.login({ email, password: pw });
      setAuth(data.user, data.token);
      navigate("/");
    } catch {
      setError("Invalid employee ID or password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (empId: string) => handleSubmit(undefined as any, empId);

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-surface-900 to-brand-950/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500/8 via-transparent to-transparent" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-brand-500/20">
            TF
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Team Flow</h1>
          <p className="text-brand-400 text-xs font-medium tracking-widest uppercase mt-0.5">Finova</p>
          <p className="text-surface-400 text-sm mt-2">Sign in with your employee ID</p>
        </div>

        <form onSubmit={(e) => handleSubmit(e)} className="bg-surface-800/80 backdrop-blur-sm border border-surface-700/50 rounded-2xl p-6 space-y-4 shadow-xl">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Employee ID</label>
            <div className="relative">
              <input
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                placeholder="e.g., EMP001"
                className="input-white w-full pl-3 pr-20 py-2.5 rounded-xl text-sm"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-500 pointer-events-none">@finova.in</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
              className="input-white w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !empId.trim() || !password.trim()}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-surface-600 disabled:cursor-not-allowed text-white font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : "Sign In"}
          </button>
        </form>

        <div className="flex gap-2 mt-4">
          <button type="button" onClick={() => quickLogin("admin")} className="flex-1 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/20 text-brand-300 text-sm font-medium transition-all">
            Login as Admin
          </button>
          <button type="button" onClick={() => quickLogin("MGR001")} className="flex-1 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/20 text-indigo-300 text-sm font-medium transition-all">
            Login as Manager
          </button>
          <button type="button" onClick={() => quickLogin("EMP001")} className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-300 text-sm font-medium transition-all">
            Login as Member
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-surface-600">
          Demo: EMP001–EMP048 (member), MGR001–MGR008 (manager), admin (admin)
        </p>
      </div>
    </div>
  );
}

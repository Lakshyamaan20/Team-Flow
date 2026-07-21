import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projects, tasks } from "../services/api";

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: projectData } = useQuery({ queryKey: ["projects"], queryFn: projects.list });
  const { data: taskData } = useQuery({ queryKey: ["allTasks"], queryFn: tasks.all });

  const q = query.toLowerCase();
  const results = useMemo(() => {
    const items: { label: string; sublabel: string; link: string; type: string }[] = [];
    if (q.length < 1) return items;
    (projectData || []).forEach((p: any) => {
      if (p.name.toLowerCase().includes(q))
        items.push({ label: p.name, sublabel: "Project", link: `/projects/${p.id}`, type: "project" });
    });
    (taskData || []).forEach((t: any) => {
      if (t.title.toLowerCase().includes(q))
        items.push({ label: t.title, sublabel: t.project?.name || "Task", link: `/projects/${t.projectId}`, type: "task" });
    });
    return items;
  }, [q, projectData, taskData]);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); return; }
      if (e.key === "Enter" && results[selected]) {
        e.preventDefault();
        navigate(results[selected].link);
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [results, selected, navigate, onClose]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-surface-800 rounded-2xl shadow-2xl border border-surface-700 overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700">
          <svg className="w-5 h-5 text-surface-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects and tasks..." className="flex-1 bg-transparent text-sm text-white placeholder-surface-400 outline-none" />
          <kbd className="text-[10px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-10">{q.length === 0 ? "Start typing to search" : "No results found"}</p>
          ) : (
            results.slice(0, 20).map((r, i) => (
              <div key={`${r.type}-${r.label}`} onClick={() => { navigate(r.link); onClose(); }} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${i === selected ? "bg-surface-700/60" : "hover:bg-surface-700/30"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.type === "project" ? "bg-brand-500/20 text-brand-400" : "bg-indigo-500/20 text-indigo-400"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {r.type === "project" ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.label}</p>
                  <p className="text-xs text-surface-400 truncate">{r.sublabel}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

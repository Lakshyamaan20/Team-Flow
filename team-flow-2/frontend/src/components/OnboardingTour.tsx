import { useEffect, useState, useCallback } from "react";
import { useTourStore } from "../store/tourStore";

const STEPS = [
  {
    target: '[data-tour="welcome"]',
    title: "Welcome to Team Flow",
    content: "Your central hub for team task management at Finova. Monitor projects, track tasks, and collaborate with your team.",
    placement: "bottom" as const,
  },
  {
    target: '[data-tour="sidebar"]',
    title: "Navigation",
    content: "Use the sidebar to quickly jump between Dashboard, Assign Tasks, My Tasks, Reports, and more.",
    placement: "right" as const,
  },
  {
    target: '[data-tour="summary"]',
    title: "At-a-Glance Stats",
    content: "See your project count, task volume, completion rate, on-time performance, and overdue items — all in one row.",
    placement: "bottom" as const,
  },
  {
    target: '[data-tour="cards"]',
    title: "Task Insights",
    content: "Visualize task status distribution and access quick actions to assign tasks, view your tasks, or browse projects.",
    placement: "top" as const,
  },
  {
    target: '[data-tour="notif"]',
    title: "Notifications & Profile",
    content: "Stay informed with real-time notifications. Your profile and logout are always accessible from the top bar.",
    placement: "bottom" as const,
  },
];

export default function OnboardingTour() {
  const { active, step, next, dismiss } = useTourStore();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const s = STEPS[step];

  const updateRect = useCallback(() => {
    if (!s) return;
    const el = document.querySelector(s.target);
    if (el) setRect(el.getBoundingClientRect());
  }, [s]);

  useEffect(() => {
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [updateRect]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "Enter" || e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") { /* no prev on purpose - simple forward flow */ }
    };
    if (active) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [active, next, dismiss]);

  if (!active || !s) return null;

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const hole = rect
    ? { left: rect.left + scrollX, top: rect.top + scrollY, width: rect.width, height: rect.height }
    : { left: 0, top: 0, width: 0, height: 0 };

  let tooltipStyle: React.CSSProperties = {};
  if (rect) {
    if (s.placement === "bottom") {
      tooltipStyle = { left: Math.max(16, rect.left + rect.width / 2 - 160), top: rect.bottom + 16 };
    } else if (s.placement === "right") {
      tooltipStyle = { left: rect.right + 16, top: Math.max(16, rect.top + rect.height / 2 - 60) };
    } else {
      tooltipStyle = { left: Math.max(16, rect.left + rect.width / 2 - 160), top: Math.max(16, rect.top - 160) };
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[999]" onClick={dismiss} />

      <div className="fixed inset-0 z-[999] pointer-events-none" style={{ clipPath: hole.width > 0 ? `polygon(0% 0%, 0% 100%, ${hole.left}px 100%, ${hole.left}px ${hole.top}px, ${hole.left + hole.width}px ${hole.top}px, ${hole.left + hole.width}px ${hole.top + hole.height}px, ${hole.left}px ${hole.top + hole.height}px, ${hole.left}px 100%, 100% 100%, 100% 0%)` : undefined, background: "rgba(0,0,0,0.55)" }} />

      <div className="fixed z-[1000]" style={tooltipStyle}>
        <div className="bg-surface-800 rounded-2xl shadow-2xl border border-surface-700 p-5 w-80 animate-scale-in">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold">{step + 1}</span>
            <span className="text-[10px] text-surface-500 uppercase tracking-wider">of {STEPS.length}</span>
          </div>
          <h3 className="text-base font-bold text-white mt-2">{s.title}</h3>
          <p className="text-sm text-surface-300 mt-1.5 leading-relaxed">{s.content}</p>
          <div className="flex items-center justify-between mt-5">
            <button onClick={dismiss} className="text-xs text-surface-400 hover:text-surface-200 transition-colors">Skip tour</button>
            <button onClick={next} className="btn-primary !text-xs !px-4 !py-2">
              {step < STEPS.length - 1 ? "Next" : "Done"}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

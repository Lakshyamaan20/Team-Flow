import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "../services/api";
import { useState, useRef, useEffect } from "react";
import Toast from "./Toast";
import Avatar from "./Avatar";
import { timeAgo } from "../utils/timeAgo";
import { useThemeStore } from "../store/themeStore";
import SearchModal from "./SearchModal";
import OnboardingTour from "./OnboardingTour";
import { useTourStore } from "../store/tourStore";

const navItems = [
  { path: "/", label: "Dashboard", permission: "canViewDashboard", roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"], icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { path: "/assign", label: "Assign Task", permission: "canAssignTask", roles: ["ADMIN", "MANAGER", "TEAM_LEAD"], icon: "M12 4v16m8-8H4" },
  { path: "/projects", label: "Projects", permission: "canViewProjects", roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"], icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },

  { path: "/my-tasks", label: "My Tasks", permission: "canViewMyTasks", roles: ["MANAGER", "TEAM_LEAD", "MEMBER"], icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { path: "/reports", label: "Reports", permission: "canViewReports", roles: ["ADMIN", "MANAGER", "TEAM_LEAD"], icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },

  { path: "/admin", label: "Admin", permission: "canViewAdmin", roles: ["ADMIN"], icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
  { path: "/activity-log", label: "Activity Log", permission: "canViewActivityLog", roles: ["ADMIN", "MANAGER", "TEAM_LEAD", "MEMBER"], icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function Layout() {
  const store = useAuthStore();
  const { user, logout, hasPermission, hasRole } = store;
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { theme, toggle: toggleTheme } = useThemeStore();

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: notifications.list,
    refetchInterval: 15000,
  });

  const unread = notifData?.filter((n: any) => !n.read).length || 0;

  const markRead = useMutation({
    mutationFn: (id: string) => notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: notifications.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNotifs]);

  const { seen, start } = useTourStore();
  useEffect(() => {
    if (user && !seen) {
      const t = setTimeout(() => start(), 300);
      return () => clearTimeout(t);
    }
  }, [user, seen, start]);

  return (
    <div className="min-h-screen flex">
      <aside data-tour="sidebar" className="sidebar w-64 bg-surface-900 flex flex-col fixed h-full z-30">
        <div className="p-5 border-b border-surface-700/50">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
              TF
            </div>
            <div>
              <span className="sidebar-logo-text text-lg font-bold text-white tracking-tight block leading-tight">Team Flow</span>
              <span className="text-[10px] font-medium text-brand-400 tracking-widest uppercase">Finova</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems
            .filter((item) => hasPermission(item.permission) || (item.roles && hasRole(...item.roles)))
            .map((item) => {
              const active = location.pathname === item.path;
              return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? "bg-brand-600/20 text-brand-300"
                        : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/50"
                    }`}
                  >
                  <svg className={`w-5 h-5 flex-shrink-0 ${active ? "text-brand-400" : "text-surface-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="p-4 border-t border-surface-700/50">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-200 truncate">{user?.name}</p>
              <p className="text-xs text-surface-500">{user?.email?.split('@')[0]?.toUpperCase()} · <Link to="/profile" className="hover:text-surface-300 transition-colors">{user?.role}</Link></p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-surface-800 transition-colors" title="Logout">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main data-tour="welcome" className="main-area flex-1 ml-64">
        <header className="bg-white border-b border-surface-200 px-8 py-2.5 flex items-center gap-2 sticky top-0 z-20">
          <button onClick={() => setShowSearch(true)} className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors" title="Search">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors" title={theme === "dark" ? "Dark mode" : "Light mode"}>
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
          <Link to="/calendar" className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors" title="Calendar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Link>
          <div data-tour="notif" className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={`relative p-2 rounded-lg transition-colors ${showNotifs ? "bg-brand-100 text-brand-600" : "text-surface-400 hover:text-surface-600 hover:bg-surface-100"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center shadow-sm ring-2 ring-white">
                  {unread}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-surface-200 z-50 animate-scale-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                  <h3 className="text-sm font-semibold text-surface-800">Notifications</h3>
                  {unread > 0 && (
                    <button onClick={() => markAllRead.mutate()} className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!notifData || notifData.length === 0 ? (
                    <p className="text-sm text-surface-400 text-center py-10">No notifications yet</p>
                  ) : (
                    notifData.slice(0, 20).map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                        className={`px-4 py-3 border-b border-surface-50 cursor-pointer transition-colors ${!n.read ? "bg-brand-50/60 hover:bg-brand-100/60" : "hover:bg-surface-50"}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? "bg-brand-500" : "bg-transparent"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-800">{n.title}</p>
                            <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-surface-400 mt-1">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
      <Toast />
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      <OnboardingTour />
    </div>
  );
}

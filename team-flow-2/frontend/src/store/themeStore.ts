import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

const stored = (typeof window !== "undefined" ? localStorage.getItem("theme") : null) as Theme | null;

export const useThemeStore = create<ThemeState>((set) => ({
  theme: stored || "light",
  toggle: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return { theme: next };
    }),
}));

if (typeof window !== "undefined") {
  const t = stored || "light";
  document.documentElement.setAttribute("data-theme", t);
}

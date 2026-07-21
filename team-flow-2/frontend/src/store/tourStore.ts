import { create } from "zustand";

interface TourState {
  seen: boolean;
  active: boolean;
  step: number;
  start: () => void;
  next: () => void;
  dismiss: () => void;
}

const KEY = "tour_seen";

export const useTourStore = create<TourState>((set, get) => ({
  seen: localStorage.getItem(KEY) === "true",
  active: false,
  step: 0,
  start: () => set({ active: true, step: 0 }),
  next: () => {
    if (get().step >= 5) { get().dismiss(); return; }
    set((s) => ({ step: s.step + 1 }));
  },
  dismiss: () => {
    localStorage.setItem(KEY, "true");
    set({ seen: true, active: false, step: 0 });
  },
}));

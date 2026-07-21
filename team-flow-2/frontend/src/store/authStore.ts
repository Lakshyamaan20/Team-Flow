import { create } from "zustand";
import { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (perm: string) => boolean;
}

function parseUser(data: any) {
  if (!data) return null;
  if (typeof data.permissions === "string") { try { data.permissions = JSON.parse(data.permissions); } catch { data.permissions = {}; } }
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: parseUser(JSON.parse(localStorage.getItem("user") || "null")),
  token: localStorage.getItem("token"),
  setAuth: (user, token) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    set({ user, token });
  },
  setUser: (user, token) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
  isAuthenticated: () => !!get().token,
  hasRole: (...roles) => {
    const user = get().user;
    return user ? roles.includes(user.role) : false;
  },
  hasPermission: (perm) => {
    const user = get().user;
    return user?.permissions?.[perm] === true;
  },
}));

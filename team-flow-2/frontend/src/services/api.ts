import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (data: { email: string; password: string }) => api.post("/auth/login", data).then((r) => r.data),
  register: (data: any) => api.post("/auth/register", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
  demoLogin: (role: string) => api.post("/auth/demo-login", { role }).then((r) => r.data),
};

export const projects = {
  list: () => api.get("/projects").then((r) => r.data),
  get: (id: string) => api.get(`/projects/${id}`).then((r) => r.data),
  create: (data: any) => api.post("/projects", data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
};

export const tasks = {
  list: (projectId: string) => api.get(`/tasks/project/${projectId}`).then((r) => r.data),
  create: (data: any) => api.post("/tasks", data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }).then((r) => r.data),
  delete: (id: string) => api.delete(`/tasks/${id}`).then((r) => r.data),
  myTasks: () => api.get("/tasks/my").then((r) => r.data),
  all: () => api.get("/tasks/all").then((r) => r.data),
  review: (id: string, data: { score: number; comment?: string }) => api.put(`/tasks/${id}/review`, data).then((r) => r.data),
  predictDeadline: (data: { estimatedHours?: number; priority: string }) => api.post("/tasks/predict-deadline", data).then((r) => r.data),
  bulk: (data: { taskIds: string[]; action: string; value?: string }) => api.post("/tasks/bulk", data).then((r) => r.data),
};

export const users = {
  list: () => api.get("/users").then((r) => r.data),
  team: (departmentId: string) => api.get(`/users/team/${departmentId}`).then((r) => r.data),
  updateRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }).then((r) => r.data),
  updateProfile: (data: { name?: string; email?: string }) => api.put("/users/profile", data).then((r) => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put("/users/password", data).then((r) => r.data),
};

export const reports = {
  overview: () => api.get("/reports/overview").then((r) => r.data),
  productivity: (userId: string) => api.get(`/reports/productivity/${userId}`).then((r) => r.data),
  team: (departmentId: string) => api.get(`/reports/team/${departmentId}`).then((r) => r.data),
  weekInReview: () => api.get("/reports/week-in-review").then((r) => r.data),
};

export const timeEntries = {
  log: (data: { taskId: string; hours: number; description?: string }) => api.post("/time-entries", data).then((r) => r.data),
  byTask: (taskId: string) => api.get(`/time-entries/task/${taskId}`).then((r) => r.data),
  byUser: (userId: string, startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return api.get(`/time-entries/user/${userId}`, { params }).then((r) => r.data);
  },
  byTeam: (departmentId: string, startDate?: string, endDate?: string) =>
    api.get(`/time-entries/team/${departmentId}`, { params: { startDate, endDate } }).then((r) => r.data),
};

export const departments = {
  list: () => api.get("/departments").then((r) => r.data),
};

export const files = {
  upload: (taskId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/files/upload/${taskId}`, form).then((r) => r.data);
  },
  list: (taskId: string) => api.get(`/files/${taskId}`).then((r) => r.data),
  downloadUrl: (id: string) => `/api/files/download/${id}`,
  delete: (id: string) => api.delete(`/files/${id}`).then((r) => r.data),
};

export const notifications = {
  list: () => api.get("/notifications").then((r) => r.data),
  unreadCount: () => api.get("/notifications/unread-count").then((r) => r.data),
  markRead: (id: string) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put("/notifications/read-all").then((r) => r.data),
};

export const activityLogs = {
  list: () => api.get("/activity-logs").then((r) => r.data),
};

export const permissionsApi = {
  list: () => api.get("/permissions").then((r) => r.data),
  update: (userId: string, data: { permissions?: Record<string, boolean>; hierarchyLevel?: number }) =>
    api.put(`/permissions/${userId}`, data).then((r) => r.data),
};

export default api;

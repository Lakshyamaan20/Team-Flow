export type Role = "ADMIN" | "MANAGER" | "TEAM_LEAD" | "MEMBER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "PENDING_APPROVAL" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
  departmentId?: string;
  department?: Department;
  hierarchyLevel?: number;
  permissions?: Record<string, boolean>;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: string;
  departmentId?: string;
  department?: Department;
  createdBy?: string;
  manager?: { id: string; name: string; avatar?: string };
  _count?: { tasks: number };
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  assigneeId?: string;
  assignee?: { id: string; name: string; avatar?: string };
  projectId: string;
  riskScore?: number;
  riskLevel?: RiskLevel;
  reviewScore?: number;
  reviewComment?: string;
  sortOrder: number;
  comments: Comment[];
  activityLogs: ActivityLog[];
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  user: { id: string; name: string; avatar?: string };
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  taskId: string;
  userId: string;
  user: { id: string; name: string };
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface ProductivityReport {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  onTimePercent: number;
  weeklyVelocity: number;
  averageCompletionHours: number;
  tasksByStatus: Record<string, number>;
}

export interface StandupSummary {
  date: string;
  summary: {
    completed: { task: string; by?: string; project: string }[];
    inProgress: { task: string; by?: string; project: string }[];
    inReview: { task: string; by?: string; project: string }[];
    pending: { task: string; assignee?: string; project: string }[];
  };
  metrics: {
    tasksCompleted: number;
    tasksInProgress: number;
    tasksInReview: number;
    tasksPending: number;
    totalUpdated: number;
  };
}

export interface AIInsight {
  date: string;
  insights: string[];
}

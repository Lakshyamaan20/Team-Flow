import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuthStore } from "./store/authStore";
import Layout from "./components/Layout";
import PageTransition from "./components/PageTransition";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AssignTask from "./pages/AssignTask";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Kanban from "./pages/Kanban";
import Gantt from "./pages/Gantt";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import ActivityLog from "./pages/ActivityLog";
import MyTasks from "./pages/MyTasks";
import Calendar from "./pages/Calendar";

function Page({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}

function ProtectedRoute({ children, roles, permission }: { children: React.ReactNode; roles?: string[]; permission?: string }) {
  const { isAuthenticated, hasRole, hasPermission } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Page><Login /></Page>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Page><Dashboard /></Page>} />
          <Route path="assign" element={<Page><ProtectedRoute permission="canAssignTask"><AssignTask /></ProtectedRoute></Page>} />
          <Route path="projects" element={<Page><Projects /></Page>} />
          <Route path="projects/:id" element={<Page><ProjectDetail /></Page>} />
          <Route path="projects/:id/kanban" element={<Page><Kanban /></Page>} />
          <Route path="projects/:id/gantt" element={<Page><Gantt /></Page>} />
          <Route path="reports" element={<Page><Reports /></Page>} />
          <Route path="reports/:userId" element={<Page><Reports /></Page>} />
          <Route path="my-tasks" element={<Page><MyTasks /></Page>} />
          <Route path="calendar" element={<Page><Calendar /></Page>} />
          <Route path="admin" element={<Page><ProtectedRoute permission="canViewAdmin"><Admin /></ProtectedRoute></Page>} />
          <Route path="activity-log" element={<Page><ProtectedRoute permission="canViewActivityLog"><ActivityLog /></ProtectedRoute></Page>} />
          <Route path="profile" element={<Page><Profile /></Page>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

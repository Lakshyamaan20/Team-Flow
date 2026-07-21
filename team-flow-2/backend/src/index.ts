import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { initDb } from "./db/index";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import taskRoutes from "./routes/tasks";
import userRoutes from "./routes/users";
import reportRoutes from "./routes/reports";
import notificationRoutes from "./routes/notifications";
import departmentRoutes from "./routes/departments";
import timeEntryRoutes from "./routes/timeEntries";
import activityLogRoutes from "./routes/activityLogs";
import permissionRoutes from "./routes/permissions";
import fileRoutes from "./routes/files";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173" },
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.use((req: any, _res, next) => {
  req.io = io;
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/time-entries", timeEntryRoutes);
app.use("/api/activity-logs", activityLogRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/files", fileRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

const PORT = process.env.PORT || 4000;

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Team Flow server running on port ${PORT}`);
  });
});

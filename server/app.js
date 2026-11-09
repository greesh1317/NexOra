import "dotenv/config"; // must be the first import so env vars exist before other files read them
import express from "express";
import cors from "cors";
import helmet from "helmet";
import projectRoutes from "./routes/projectRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import attachmentRoutes from "./routes/attachmentRoutes.js";
import { hideErrorDetails } from "./middleware/hideErrorDetails.js";
import { dbIsUp } from "./config/db.js";

const app = express();

// On Render/Heroku the app sits behind a proxy; this lets rate limiting see the real client IP
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json());
app.use(hideErrorDetails);

app.get("/", (req, res) => {
  res.json({ message: "NexOra API is running" });
});

// For uptime monitors and deployment checks: 200 when everything works, 503 when the database is down
app.get("/health", (req, res) => {
  const up = dbIsUp();
  res.status(up ? 200 : 503).json({ status: up ? "ok" : "degraded", database: up ? "connected" : "disconnected" });
});

// While MongoDB is unreachable, answer clearly and quickly instead of letting requests hang or crash
app.use("/api", (req, res, next) => {
  if (dbIsUp()) return next();
  res.set("Retry-After", "5");
  res.status(503).json({ message: "The database is temporarily unavailable. Please try again in a moment." });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/attachments", attachmentRoutes);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;

import express from "express";
import { getProjectAnalytics, getOverviewAnalytics } from "../controllers/analyticsController.js";
import { getProjectReport, downloadProjectReport } from "../controllers/projectReportController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/overview", protect, authorize("manager"), getOverviewAnalytics);
router.get("/project/:projectId", protect, authorize("manager", "team_leader"), getProjectAnalytics);
router.get("/report", protect, authorize("manager", "team_leader"), getProjectReport);
router.get("/report.csv", protect, authorize("manager", "team_leader"), downloadProjectReport);

export default router;

import express from "express";
import { getProjectAnalytics, getOverviewAnalytics } from "../controllers/analyticsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/overview", protect, authorize("manager"), getOverviewAnalytics);
router.get("/project/:projectId", protect, authorize("manager", "team_leader"), getProjectAnalytics);

export default router;

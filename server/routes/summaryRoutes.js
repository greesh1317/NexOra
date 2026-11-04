import express from "express";
import { generateSummary } from "../controllers/summaryController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { summaryLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.post("/", protect, authorize("manager", "team_leader"), summaryLimiter, generateSummary);

export default router;

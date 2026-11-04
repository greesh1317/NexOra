import express from "express";
import { getReports, createReport } from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getReports).post(protect, createReport);

export default router;

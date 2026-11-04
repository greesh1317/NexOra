import express from "express";
import { getTeams, createTeam, updateTeam } from "../controllers/teamController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getTeams).post(protect, authorize("manager"), createTeam);
router.route("/:id").put(protect, authorize("manager"), updateTeam);

export default router;

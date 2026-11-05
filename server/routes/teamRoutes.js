import express from "express";
import { getTeams, getTeam, createTeam, updateTeam, deleteTeam } from "../controllers/teamController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getTeams).post(protect, authorize("manager"), createTeam);
router
  .route("/:id")
  .get(protect, getTeam)
  .put(protect, authorize("manager"), updateTeam)
  .delete(protect, authorize("manager"), deleteTeam);

export default router;

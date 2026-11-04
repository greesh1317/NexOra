import express from "express";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(protect, getProjects)
  .post(protect, authorize("manager"), createProject);

router
  .route("/:id")
  .put(protect, authorize("manager"), updateProject)
  .delete(protect, authorize("manager"), deleteProject);

export default router;

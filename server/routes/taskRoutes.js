import express from "express";
import { getTasks, createTask, updateTask, deleteTask } from "../controllers/taskController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(protect, getTasks)
  .post(protect, authorize("manager", "team_leader"), createTask);

router
  .route("/:id")
  .put(protect, updateTask) // fine-grained ownership check happens inside the controller
  .delete(protect, authorize("manager", "team_leader"), deleteTask);

export default router;

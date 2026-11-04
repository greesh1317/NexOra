import express from "express";
import { getUsers, getMe, createUser, changePassword } from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("manager", "team_leader"), getUsers);
router.get("/me", protect, getMe);
router.put("/me/password", protect, changePassword);
router.post("/", protect, authorize("manager"), createUser);

export default router;

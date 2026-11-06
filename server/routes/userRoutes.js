import express from "express";
import { getUsers, getMe, createUser, changePassword, setUserStatus, resetUserPassword } from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("manager", "team_leader"), getUsers);
router.get("/me", protect, getMe);
router.put("/me/password", protect, changePassword);
router.post("/", protect, authorize("manager"), createUser);
router.put("/:id/status", protect, authorize("manager"), setUserStatus);
router.put("/:id/password", protect, authorize("manager"), resetUserPassword); // after /me/password, so "me" never matches :id

export default router;

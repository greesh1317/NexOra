import express from "express";
import { getUsers, getMe } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getUsers);
router.get("/me", protect, getMe);

export default router;

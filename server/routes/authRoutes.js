import express from "express";
import { loginUser } from "../controllers/authController.js";
import { loginLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// There is intentionally NO public /register route: only a Manager can create accounts
// (POST /api/users). The demo accounts come from `npm run seed`.
router.post("/login", loginLimiter, loginUser);

export default router;

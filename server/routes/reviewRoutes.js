import express from "express";
import { getReviews, createReview } from "../controllers/reviewController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .get(protect, getReviews)
  .post(protect, authorize("manager", "team_leader"), createReview);

export default router;

import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import { leaderProjectIds, leadsProject } from "../utils/access.js";

// @desc    Get reviews — Team Member sees only reviews written about them, Team Leader sees
//          reviews they wrote plus reviews on projects they lead, Manager sees everyone's
// @route   GET /api/reviews
export const getReviews = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "team_member") {
      filter.employee = req.user._id;
    }
    if (req.query.project) {
      filter.project = req.query.project;
    }
    if (req.query.employee && req.user.role !== "team_member") {
      filter.employee = req.query.employee;
    }

    let query = filter;
    if (req.user.role === "team_leader") {
      const ids = await leaderProjectIds(req.user._id);
      query = { $and: [filter, { $or: [{ reviewer: req.user._id }, { project: { $in: ids } }] }] };
    }

    const reviews = await Review.find(query)
      .populate("reviewer", "name role")
      .populate("employee", "name role")
      .populate("project", "title")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
};

// @desc    Leave a review on a team member's work (Manager or Team Leader)
// @route   POST /api/reviews
export const createReview = async (req, res) => {
  try {
    const { employee, project, rating, comments } = req.body;

    if (!employee || !rating) {
      return res.status(400).json({ message: "employee and rating are required" });
    }
    if (project && req.user.role === "team_leader" && !(await leadsProject(req.user._id, project))) {
      return res.status(403).json({ message: "You can only review work on projects you lead" });
    }

    const review = await Review.create({
      reviewer: req.user._id,
      employee,
      project,
      rating,
      comments,
    });

    const populated = await review.populate([
      { path: "reviewer", select: "name role" },
      { path: "employee", select: "name role" },
      { path: "project", select: "title" },
    ]);

    try {
      await Notification.create({
        recipient: employee,
        type: "review",
        message: `${req.user.name} left you a ${rating}/5 review${comments ? ': "' + comments + '"' : ""}`,
      });
    } catch (notifyError) {
      console.error("Failed to create review notification:", notifyError.message);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
};

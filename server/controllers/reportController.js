import DailyReport from "../models/DailyReport.js";

// @desc    Get daily reports — Team Member sees only their own,
//          Manager/Team Leader see everyone's
// @route   GET /api/reports
export const getReports = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "team_member") {
      filter.user = req.user._id;
    }
    if (req.query.project) {
      filter.project = req.query.project;
    }

    const reports = await DailyReport.find(filter)
      .populate("user", "name email role")
      .populate("project", "title")
      .sort({ date: -1 });

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reports", error: error.message });
  }
};

// @desc    Submit a daily report (any logged-in user, typically a Team Member)
// @route   POST /api/reports
export const createReport = async (req, res) => {
  try {
    const { project, workDone, blockers, hours } = req.body;

    if (!workDone) {
      return res.status(400).json({ message: "workDone is required" });
    }

    const report = await DailyReport.create({
      user: req.user._id,
      project,
      workDone,
      blockers,
      hours,
    });

    const populated = await report.populate([
      { path: "user", select: "name email role" },
      { path: "project", select: "title" },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to submit report", error: error.message });
  }
};

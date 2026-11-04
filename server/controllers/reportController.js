import DailyReport from "../models/DailyReport.js";
import Task from "../models/Task.js";
import { leaderProjectIds } from "../utils/access.js";

// Submission links must be real web links — blocks things like "javascript:..." being stored
const isValidLink = (value) => !value || /^https?:\/\/\S+$/i.test(String(value).trim());

// @desc    Get daily reports — Team Member sees only their own, Team Leader sees reports on
//          projects they lead, Manager sees everyone's
// @route   GET /api/reports
export const getReports = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "team_member") {
      filter.user = req.user._id;
      if (req.query.project) filter.project = req.query.project;
    } else if (req.user.role === "team_leader") {
      const ids = await leaderProjectIds(req.user._id);
      const wanted = req.query.project;
      filter.project = wanted ? (ids.some((i) => String(i) === String(wanted)) ? wanted : { $in: [] }) : { $in: ids };
    } else if (req.query.project) {
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

// @desc    Submit a daily report. A Team Member reports against a project they have a task in,
//          which is what lets that project's Team Leader see it.
// @route   POST /api/reports
export const createReport = async (req, res) => {
  try {
    const { project, workDone, blockers, hours, submissionLink } = req.body;

    if (!workDone) {
      return res.status(400).json({ message: "workDone is required" });
    }
    if (!isValidLink(submissionLink)) {
      return res.status(400).json({ message: "Submission link must start with http:// or https://" });
    }

    if (project && req.user.role === "team_member") {
      const hasTask = await Task.exists({ project, assignedUser: req.user._id });
      if (!hasTask) {
        return res.status(403).json({ message: "You can only report on projects you have a task in" });
      }
    }

    const report = await DailyReport.create({
      user: req.user._id,
      project,
      workDone,
      blockers,
      hours,
      submissionLink,
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

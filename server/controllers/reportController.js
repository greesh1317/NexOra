import mongoose from "mongoose";
import DailyReport from "../models/DailyReport.js";
import User from "../models/User.js";
import { getPaging, listResult, searchRegex } from "../utils/paging.js";
import { leaderProjectIds, leadsProject } from "../utils/access.js";
import { workedOnProject } from "../utils/integrity.js";

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
    } else if (req.query.project === "none") {
      filter.project = null; // Manager only: reports whose project was deleted (history)
    } else if (req.query.project) {
      filter.project = req.query.project;
    }

    // Optional ?search= (work description or person's name)
    if (req.query.search && String(req.query.search).trim()) {
      const regex = searchRegex(req.query.search);
      const userIds = await User.find({ name: regex }).distinct("_id");
      filter.$and = [{ $or: [{ workDone: regex }, { user: { $in: userIds } }] }];
    }

    const reports = await listResult(
      DailyReport,
      filter,
      (q) => q.populate("user", "name email role").populate("project", "title").sort({ date: -1, _id: -1 }), // _id breaks ties so pages never repeat or skip rows
      getPaging(req.query)
    );

    res.status(200).json(reports);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid filter" });
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

    if (String(workDone).length > 5000) {
      return res.status(400).json({ message: "Work done is limited to 5000 characters" });
    }
    if (hours !== undefined && hours !== null && hours !== "") {
      const h = Number(hours);
      if (!Number.isFinite(h) || h < 0 || h > 24) {
        return res.status(400).json({ message: "Hours must be a number between 0 and 24" });
      }
    }
    if (project && !mongoose.isValidObjectId(project)) {
      return res.status(400).json({ message: "Invalid project" });
    }

    // A member reports on a project they are part of; a leader only on a project they lead
    if (project && req.user.role === "team_member" && !(await workedOnProject(project, req.user._id))) {
      return res.status(403).json({ message: "You can only report on projects you are part of" });
    }
    if (project && req.user.role === "team_leader" && !(await leadsProject(req.user._id, project))) {
      return res.status(403).json({ message: "You can only report on projects you lead" });
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

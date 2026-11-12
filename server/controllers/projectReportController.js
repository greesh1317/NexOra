import mongoose from "mongoose";
import Task from "../models/Task.js";
import DailyReport from "../models/DailyReport.js";
import Project from "../models/Project.js";
import { leadsProject, leaderProjectIds } from "../utils/access.js";
import { PERIODS, MAX_ROWS, buildReport, reportToCsv, reportFilename } from "../utils/report.js";

const DAY = 24 * 60 * 60 * 1000;

// Works out what the caller asked for and may see, then builds the report.
// Returns { error: { status, message } } or { report }.
async function loadReport(req) {
  const period = req.query.period || "week";
  if (!PERIODS[period]) return { error: { status: 400, message: 'period must be "week" or "month"' } };

  const { project } = req.query;
  if (project && !mongoose.isValidObjectId(project)) return { error: { status: 400, message: "Invalid project" } };

  const isLeader = req.user.role === "team_leader";
  let projectLabel = isLeader ? "All my projects" : "All projects";
  let scope = {};

  if (project) {
    if (isLeader && !(await leadsProject(req.user._id, project))) {
      return { error: { status: 403, message: "You can only report on projects you lead" } };
    }
    const projectDoc = await Project.findById(project).select("title");
    if (!projectDoc) return { error: { status: 404, message: "Project not found" } };
    projectLabel = projectDoc.title;
    scope = { project };
  } else if (isLeader) {
    scope = { project: { $in: await leaderProjectIds(req.user._id) } }; // a leader's "everything" = their own projects
  }

  const now = new Date();
  const since = new Date(now.getTime() - PERIODS[period].days * DAY);

  const [tasks, reports] = await Promise.all([
    Task.find(scope)
      .populate("assignedUser", "name")
      .populate("project", "title")
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_ROWS + 1),
    DailyReport.find({ ...scope, date: { $gte: since } })
      .populate("user", "name")
      .populate("project", "title")
      .sort({ date: -1, _id: -1 })
      .limit(MAX_ROWS + 1),
  ]);

  const truncated = { tasks: tasks.length > MAX_ROWS, reports: reports.length > MAX_ROWS };
  const report = buildReport({
    tasks: tasks.slice(0, MAX_ROWS),
    reports: reports.slice(0, MAX_ROWS),
    projectLabel,
    period,
    generatedBy: req.user.name,
    now,
    truncated,
  });
  return { report };
}

// @desc    A weekly / monthly project report as data (what the screen shows)
// @route   GET /api/analytics/report?project=<id>&period=week|month
export const getProjectReport = async (req, res) => {
  try {
    const { error, report } = await loadReport(req);
    if (error) return res.status(error.status).json({ message: error.message });
    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ message: "Failed to build the report", error: err.message });
  }
};

// @desc    The same report as a CSV file that opens in Excel
// @route   GET /api/analytics/report.csv?project=<id>&period=week|month
export const downloadProjectReport = async (req, res) => {
  try {
    const { error, report } = await loadReport(req);
    if (error) return res.status(error.status).json({ message: error.message });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${reportFilename(report.meta)}"`);
    res.status(200).send(reportToCsv(report));
  } catch (err) {
    res.status(500).json({ message: "Failed to build the report", error: err.message });
  }
};

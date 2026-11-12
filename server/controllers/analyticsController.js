import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { leadsProject } from "../utils/access.js";
import { summarize } from "../utils/analytics.js";

// @desc    Get task analytics for one project: status counts, completion rate, overdue and due-soon tasks,
//          the weekly completion trend, and the workload of each person
// @route   GET /api/analytics/project/:projectId
export const getProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project" });
    }
    if (req.user.role === "team_leader" && !(await leadsProject(req.user._id, projectId))) {
      return res.status(403).json({ message: "You can only view analytics for projects you lead" });
    }
    const tasks = await Task.find({ project: projectId }).populate("assignedUser", "name").populate("project", "title");
    res.status(200).json(summarize(tasks));
  } catch (error) {
    res.status(500).json({ message: "Failed to compute analytics", error: error.message });
  }
};

// @desc    Get org-wide analytics across every project (Manager only)
// @route   GET /api/analytics/overview
export const getOverviewAnalytics = async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedUser", "name").populate("project", "title");
    const overall = summarize(tasks);

    const projects = await Project.find();
    const byProject = projects.map((p) => {
      const projectTasks = tasks.filter((t) => t.project?._id?.toString() === p._id.toString());
      return { projectId: p._id, title: p.title, ...summarize(projectTasks, { withLists: false }) };
    });

    res.status(200).json({ overall, byProject });
  } catch (error) {
    res.status(500).json({ message: "Failed to compute analytics", error: error.message });
  }
};

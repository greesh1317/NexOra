import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { leadsProject } from "../utils/access.js";

const STATUS_KEYS = ["not_started", "in_progress", "completed", "blocked"];

// Turn a list of tasks into simple counts — plain find + loop (no aggregation pipeline) so it is easy to explain
function summarize(tasks) {
  const byStatus = { not_started: 0, in_progress: 0, completed: 0, blocked: 0 };
  const byPerson = {}; // userId -> { name, completed, total }

  for (const t of tasks) {
    if (STATUS_KEYS.includes(t.status)) byStatus[t.status] += 1;

    if (t.assignedUser) {
      const id = t.assignedUser._id?.toString() || t.assignedUser.toString();
      const name = t.assignedUser.name || "Unknown";
      if (!byPerson[id]) byPerson[id] = { name, completed: 0, total: 0 };
      byPerson[id].total += 1;
      if (t.status === "completed") byPerson[id].completed += 1;
    }
  }

  const total = tasks.length;
  const completionRate = total === 0 ? 0 : Math.round((byStatus.completed / total) * 100);

  return {
    total,
    byStatus,
    completionRate,
    byPerson: Object.values(byPerson).sort((a, b) => b.completed - a.completed),
  };
}

// @desc    Get task-completion analytics for one project
// @route   GET /api/analytics/project/:projectId
export const getProjectAnalytics = async (req, res) => {
  try {
    if (req.user.role === "team_leader" && !(await leadsProject(req.user._id, req.params.projectId))) {
      return res.status(403).json({ message: "You can only view analytics for projects you lead" });
    }
    const tasks = await Task.find({ project: req.params.projectId }).populate("assignedUser", "name");
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
      return { projectId: p._id, title: p.title, ...summarize(projectTasks) };
    });

    res.status(200).json({ overall, byProject });
  } catch (error) {
    res.status(500).json({ message: "Failed to compute analytics", error: error.message });
  }
};

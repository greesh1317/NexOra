import Task from "../models/Task.js";
import Notification from "../models/Notification.js";
import Attachment from "../models/Attachment.js";
import { leaderProjectIds, leadsProject } from "../utils/access.js";
import { assigneeProblem } from "../utils/teamRules.js";

// Submission links must be real web links — blocks things like "javascript:..." being stored
const isValidLink = (value) => !value || /^https?:\/\/\S+$/i.test(String(value).trim());

// @desc    Get tasks — Manager sees all, Team Leader sees tasks in projects they lead,
//          Team Member sees only tasks assigned to them. Optional ?project= filter.
// @route   GET /api/tasks
export const getTasks = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "team_member") {
      filter.assignedUser = req.user._id;
      if (req.query.project) filter.project = req.query.project;
    } else if (req.user.role === "team_leader") {
      const ids = await leaderProjectIds(req.user._id);
      const wanted = req.query.project;
      filter.project = wanted ? (ids.some((i) => String(i) === String(wanted)) ? wanted : { $in: [] }) : { $in: ids };
    } else if (req.query.project) {
      filter.project = req.query.project;
    }

    const tasks = await Task.find(filter)
      .populate("project", "title status")
      .populate("assignedUser", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks", error: error.message });
  }
};

// @desc    Create a task (Manager, or a Team Leader inside a project they lead)
// @route   POST /api/tasks
export const createTask = async (req, res) => {
  try {
    const { title, project, assignedUser, deadline, priority, submissionLink } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!isValidLink(submissionLink)) {
      return res.status(400).json({ message: "Submission link must start with http:// or https://" });
    }

    if (req.user.role === "team_leader") {
      if (!project) {
        return res.status(400).json({ message: "Choose one of your projects for this task" });
      }
      if (!(await leadsProject(req.user._id, project))) {
        return res.status(403).json({ message: "You can only create tasks in projects you lead" });
      }
    }

    // The assignee must be a Team Member of the project's team
    const problem = await assigneeProblem(project, assignedUser);
    if (problem) return res.status(400).json({ message: problem });

    const task = await Task.create({
      title,
      project,
      assignedUser,
      deadline,
      priority,
      submissionLink,
    });
    const populated = await task.populate([
      { path: "project", select: "title status" },
      { path: "assignedUser", select: "name email role" },
    ]);

    // Let the assignee know — a failure here must not block the task creation itself
    if (assignedUser) {
      try {
        await Notification.create({
          recipient: assignedUser,
          type: "assignment",
          message: `You were assigned a new task: "${title}"`,
        });
      } catch (notifyError) {
        console.error("Failed to create assignment notification:", notifyError.message);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
};

// Can this user manage (edit/delete) this task? Managers always; leaders only in their own projects.
const canManageTask = async (user, task) =>
  user.role === "manager" || (user.role === "team_leader" && (await leadsProject(user._id, task.project)));

// @desc    Update a task — the assignee can change status + proof link on their own task;
//          Manager / the project's Team Leader can update anything
// @route   PUT /api/tasks/:id
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isOwnTask = task.assignedUser?.toString() === req.user._id.toString();
    const isElevated = await canManageTask(req.user, task);

    if (!isOwnTask && !isElevated) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    if (!isValidLink(req.body.submissionLink)) {
      return res.status(400).json({ message: "Submission link must start with http:// or https://" });
    }

    // The assignee (when not also a manager/leader of the project) can only change their own
    // task's status and attach proof-of-work — never reassign, retitle or reprioritize it.
    // Only keys actually sent are updated.
    let updates = {};
    if (isElevated) {
      for (const key of ["title", "project", "assignedUser", "deadline", "status", "priority", "submissionLink"]) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      // A Team Leader may only move a task into a project they lead
      const movingProject = updates.project && String(updates.project) !== String(task.project);
      if (movingProject && req.user.role === "team_leader" && !(await leadsProject(req.user._id, updates.project))) {
        return res.status(403).json({ message: "You can only move tasks into projects you lead" });
      }
      if (updates.assignedUser === "") updates.assignedUser = null; // "" means: unassign

      // Re-check the assignee whenever the assignee or the project changes
      if (updates.assignedUser !== undefined || updates.project !== undefined) {
        const project = updates.project !== undefined ? updates.project : task.project;
        const assignee = updates.assignedUser !== undefined ? updates.assignedUser : task.assignedUser;
        const problem = await assigneeProblem(project, assignee);
        if (problem) return res.status(400).json({ message: problem });
      }
    } else {
      updates = {};
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.submissionLink !== undefined) updates.submissionLink = req.body.submissionLink;
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("project", "title status")
      .populate("assignedUser", "name email role");

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update task", error: error.message });
  }
};

// @desc    Delete a task (Manager, or the Team Leader of the task's project)
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (!(await canManageTask(req.user, task))) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }
    await Attachment.deleteMany({ task: task._id }); // its files go with it
    await task.deleteOne();
    res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
};

import Task from "../models/Task.js";

// @desc    Get tasks — Manager sees all, Team Leader sees tasks for their projects,
//          Team Member sees only tasks assigned to them
// @route   GET /api/tasks
export const getTasks = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "team_member") {
      filter.assignedUser = req.user._id;
    }
    if (req.query.project) {
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

// @desc    Create a task (Manager or Team Leader)
// @route   POST /api/tasks
export const createTask = async (req, res) => {
  try {
    const { title, project, assignedUser, deadline, priority } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const task = await Task.create({ title, project, assignedUser, deadline, priority });
    const populated = await task.populate([
      { path: "project", select: "title status" },
      { path: "assignedUser", select: "name email role" },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
};

// @desc    Update a task — Team Member can update status on their own task;
//          Manager/Team Leader can update anything
// @route   PUT /api/tasks/:id
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isOwnTask = task.assignedUser?.toString() === req.user._id.toString();
    const isElevated = req.user.role === "manager" || req.user.role === "team_leader";

    if (!isOwnTask && !isElevated) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    // Team members can only change status, not reassign or retitle a task
    const updates = isElevated ? req.body : { status: req.body.status };

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

// @desc    Delete a task (Manager or Team Leader)
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
};

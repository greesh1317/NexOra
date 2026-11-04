import Project from "../models/Project.js";

// @desc    Get projects — Manager sees all, Team Leader sees projects they lead,
//          Team Member sees all (read-only) so they can find their assigned work
// @route   GET /api/projects
export const getProjects = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "team_leader") {
      filter.leader = req.user._id;
    }

    const projects = await Project.find(filter)
      .populate("leader", "name email role")
      .populate("team", "teamName")
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects", error: error.message });
  }
};

// @desc    Create a project
// @route   POST /api/projects
export const createProject = async (req, res) => {
  try {
    const { title, description, status, startDate, endDate, team, leader } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const project = await Project.create({
      title,
      description,
      status,
      startDate,
      endDate,
      team,
      leader,
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to create project", error: error.message });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to update project", error: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({ message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete project", error: error.message });
  }
};

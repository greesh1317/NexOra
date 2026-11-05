import mongoose from "mongoose";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import { cleanupProject } from "../utils/integrity.js";

// A project's leader must be a real Team Leader account
const isTeamLeader = (id) => User.exists({ _id: id, role: "team_leader" });

// A project linked to a team is led by that team's leader. Returns { error } or { team, leader }.
// `leaderId` is what the caller asked for (may be undefined = no preference).
async function applyTeam(teamId, leaderId) {
  if (!teamId) return { team: null, leader: leaderId };
  if (!mongoose.isValidObjectId(teamId)) return { error: "Invalid team" };

  const team = await Team.findById(teamId).select("leader");
  if (!team) return { error: "That team does not exist" };

  if (team.leader) {
    if (leaderId && String(leaderId) !== String(team.leader)) {
      return { error: "The project leader must be the leader of the chosen team" };
    }
    return { team: team._id, leader: team.leader };
  }
  return { team: team._id, leader: leaderId };
}

// @desc    Get projects — Manager sees all, Team Leader sees projects they lead,
//          Team Member sees only their team's projects and projects where they have a task (read-only)
// @route   GET /api/projects
export const getProjects = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "team_leader") {
      filter.leader = req.user._id;
    } else if (req.user.role === "team_member") {
      // Projects of the member's own team, plus any project they have a task in
      const myTeamIds = await Team.find({ members: req.user._id }).distinct("_id");
      const taskProjectIds = await Task.find({ assignedUser: req.user._id }).distinct("project");
      filter.$or = [{ team: { $in: myTeamIds } }, { _id: { $in: taskProjectIds } }];
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

    if (leader && !(await isTeamLeader(leader))) {
      return res.status(400).json({ message: "The project leader must be a Team Leader account" });
    }

    const linked = await applyTeam(team, leader);
    if (linked.error) return res.status(400).json({ message: linked.error });

    const project = await Project.create({
      title,
      description,
      status,
      startDate,
      endDate,
      team: linked.team,
      leader: linked.leader,
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
    const updates = {};
    for (const key of ["title", "description", "status", "startDate", "endDate", "team", "leader"]) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.leader && !(await isTeamLeader(updates.leader))) {
      return res.status(400).json({ message: "The project leader must be a Team Leader account" });
    }

    const existing = await Project.findById(req.params.id).select("team");
    if (!existing) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Keep the project's team and leader consistent (the team's leader leads the project)
    const effectiveTeam = updates.team !== undefined ? updates.team : existing.team;
    const linked = await applyTeam(effectiveTeam, updates.leader);
    if (linked.error) return res.status(400).json({ message: linked.error });
    if (updates.team !== undefined) updates.team = linked.team;
    if (linked.leader) updates.leader = linked.leader;

    const project = await Project.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json(project);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to update project", error: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Delete its tasks + their files; reports and reviews stay as history without the project link
    const { tasksDeleted } = await cleanupProject(project._id);
    await project.deleteOne();

    res.status(200).json({ message: "Project deleted", tasksDeleted });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to delete project", error: error.message });
  }
};

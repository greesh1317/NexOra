import Team from "../models/Team.js";
import Project from "../models/Project.js";
import { checkTeamPeople, visibleTeamFilter } from "../utils/teamRules.js";

const populateTeam = (query) =>
  query.populate("leader", "name email role").populate("members", "name email role isActive");

// @desc    Get the teams you are allowed to see
// @route   GET /api/teams
export const getTeams = async (req, res) => {
  try {
    const teams = await populateTeam(Team.find(await visibleTeamFilter(req.user))).sort({ createdAt: -1 });
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teams", error: error.message });
  }
};

// @desc    Get one team (only if you are allowed to see it)
// @route   GET /api/teams/:id
export const getTeam = async (req, res) => {
  try {
    // visibleTeamFilter may itself contain $or, so combine the two conditions with $and
    const team = await populateTeam(Team.findOne({ $and: [{ _id: req.params.id }, await visibleTeamFilter(req.user)] }));
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.status(200).json(team);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to fetch team", error: error.message });
  }
};

// @desc    Create a team (Manager only)
// @route   POST /api/teams
export const createTeam = async (req, res) => {
  try {
    const teamName = String(req.body.teamName || "").trim();
    if (!teamName) {
      return res.status(400).json({ message: "Team name is required" });
    }

    const check = await checkTeamPeople({ leader: req.body.leader, members: req.body.members });
    if (check.error) return res.status(400).json({ message: check.error });

    const team = await Team.create({ teamName, leader: check.leader, members: check.members });
    res.status(201).json(await populateTeam(Team.findById(team._id)));
  } catch (error) {
    res.status(500).json({ message: "Failed to create team", error: error.message });
  }
};

// @desc    Update a team: rename, change leader, add/remove members (Manager only)
// @route   PUT /api/teams/:id
export const updateTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const oldLeader = team.leader ? String(team.leader) : null;

    if (req.body.teamName !== undefined) {
      const name = String(req.body.teamName).trim();
      if (!name) return res.status(400).json({ message: "Team name is required" });
      team.teamName = name;
    }

    const leader = req.body.leader !== undefined ? req.body.leader : team.leader;
    const members = req.body.members !== undefined ? req.body.members : team.members;

    const check = await checkTeamPeople({ leader, members, teamId: team._id });
    if (check.error) return res.status(400).json({ message: check.error });

    team.leader = check.leader;
    team.members = check.members;
    await team.save();

    // Projects follow their team's leader, so a leader change reaches every project of this team
    const newLeader = check.leader ? String(check.leader) : null;
    if (newLeader && newLeader !== oldLeader) {
      await Project.updateMany({ team: team._id }, { leader: newLeader });
    }

    res.status(200).json(await populateTeam(Team.findById(team._id)));
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to update team", error: error.message });
  }
};

// @desc    Delete a team (Manager only) — blocked while projects still use it
// @route   DELETE /api/teams/:id
export const deleteTeam = async (req, res) => {
  try {
    const inUse = await Project.countDocuments({ team: req.params.id });
    if (inUse > 0) {
      return res.status(409).json({
        message: `${inUse} project(s) still use this team. Move them to another team first.`,
      });
    }
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.status(200).json({ message: "Team deleted" });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to delete team", error: error.message });
  }
};

import Team from "../models/Team.js";
import Project from "../models/Project.js";

// @desc    Get all teams
// @route   GET /api/teams
export const getTeams = async (req, res) => {
  try {
    // Manager: every team. Leader: teams they lead or that work on a project they lead.
    // Member: only teams they belong to.
    const filter = {};
    if (req.user.role === "team_leader") {
      const teamIds = await Project.find({ leader: req.user._id }).distinct("team");
      filter.$or = [{ leader: req.user._id }, { _id: { $in: teamIds } }];
    } else if (req.user.role === "team_member") {
      filter.members = req.user._id;
    }

    const teams = await Team.find(filter)
      .populate("leader", "name email role")
      .populate("members", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teams", error: error.message });
  }
};

// @desc    Create a team (Manager only)
// @route   POST /api/teams
export const createTeam = async (req, res) => {
  try {
    const { teamName, leader, members } = req.body;

    if (!teamName) {
      return res.status(400).json({ message: "Team name is required" });
    }

    const team = await Team.create({ teamName, leader, members });
    const populated = await team.populate([
      { path: "leader", select: "name email role" },
      { path: "members", select: "name email role" },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to create team", error: error.message });
  }
};

// @desc    Update a team (e.g. add members, change leader)
// @route   PUT /api/teams/:id
export const updateTeam = async (req, res) => {
  try {
    // Only these fields may be changed (blocks sneaking in other fields)
    const updates = {};
    for (const key of ["teamName", "leader", "members"]) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const team = await Team.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("leader", "name email role")
      .populate("members", "name email role");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.status(200).json(team);
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid id" });
    res.status(500).json({ message: "Failed to update team", error: error.message });
  }
};

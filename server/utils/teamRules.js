// The team rules in one place, so every controller enforces them the same way:
//   - a team leader must be a Team Leader account, and leads at most ONE team
//   - team members must be Team Member accounts, and belong to at most ONE team
//   - a task can only be assigned to a member of the project's team
import mongoose from "mongoose";
import Team from "../models/Team.js";
import User from "../models/User.js";
import Project from "../models/Project.js";

const uniqueIds = (list = []) => [...new Set(list.map(String))];

// Check a proposed leader + member list. Returns { error } or { leader, members } (cleaned up).
// `teamId` is the team being edited (so it doesn't clash with itself); leave it out when creating.
export async function checkTeamPeople({ leader, members = [], teamId }) {
  const notThisTeam = teamId ? { _id: { $ne: teamId } } : {};
  const memberIds = uniqueIds(members);

  if (![...memberIds, ...(leader ? [String(leader)] : [])].every((id) => mongoose.isValidObjectId(id))) {
    return { error: "One of the selected people is invalid" };
  }

  if (leader) {
    const leaderUser = await User.findById(leader).select("name role");
    if (!leaderUser || leaderUser.role !== "team_leader") {
      return { error: "The team leader must be a Team Leader account" };
    }
    const otherTeam = await Team.findOne({ leader, ...notThisTeam }).select("teamName");
    if (otherTeam) {
      return { error: `${leaderUser.name} already leads the team "${otherTeam.teamName}"` };
    }
  }

  if (memberIds.length > 0) {
    const users = await User.find({ _id: { $in: memberIds } }).select("name role");
    if (users.length !== memberIds.length) {
      return { error: "One or more selected members do not exist" };
    }
    const notMember = users.find((u) => u.role !== "team_member");
    if (notMember) {
      return { error: `${notMember.name} is not a Team Member account` };
    }
    const clash = await Team.findOne({ members: { $in: memberIds }, ...notThisTeam }).select("teamName members");
    if (clash) {
      const clashing = users.find((u) => clash.members.some((m) => String(m) === String(u._id)));
      return { error: `${clashing.name} is already in the team "${clash.teamName}"` };
    }
  }

  return { leader: leader || null, members: memberIds };
}

// Can this person be given a task in this project? Returns an error message, or null when fine.
export async function assigneeProblem(projectId, userId) {
  if (!userId) return null; // unassigned is fine

  if (!mongoose.isValidObjectId(userId)) return "Invalid assignee";
  const user = await User.findById(userId).select("role");
  if (!user) return "That assignee does not exist";
  if (user.role !== "team_member") return "Tasks can only be assigned to Team Members";

  if (!projectId) return null; // a task with no project has no team to check against

  const project = await Project.findById(projectId).select("team title");
  if (!project) return "That project does not exist";
  if (!project.team) return `Link "${project.title}" to a team before assigning tasks in it`;

  const inTeam = await Team.exists({ _id: project.team, members: userId });
  return inTeam ? null : "That person is not a member of this project's team";
}

// A Mongo filter for "the teams this user may see"
//   Manager: all · Team Leader: teams they lead or that work on their projects · Team Member: their own team
export async function visibleTeamFilter(user) {
  if (user.role === "team_leader") {
    const projectTeamIds = await Project.find({ leader: user._id, team: { $ne: null } }).distinct("team");
    return { $or: [{ leader: user._id }, { _id: { $in: projectTeamIds } }] };
  }
  if (user.role === "team_member") return { members: user._id };
  return {};
}

// Run ONCE after updating to Phase 2:  npm run attach-teams
// Your existing projects have a leader but no team. This script gives each project's leader a team
// (reusing a team they already lead), puts everyone who already has tasks in those projects into it,
// and links the projects to that team. It is safe to re-run. Nothing is deleted.
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";

await connectDB();

const projects = await Project.find({ team: null });
if (projects.length === 0) console.log("Every project already has a team. Nothing to do.");

// group the unlinked projects by their leader
const byLeader = new Map();
for (const p of projects) {
  if (!p.leader) {
    console.log(`SKIPPED project "${p.title}": it has no leader. Edit it in the app to choose a team.`);
    continue;
  }
  const key = String(p.leader);
  byLeader.set(key, [...(byLeader.get(key) || []), p]);
}

for (const [leaderId, leaderProjects] of byLeader) {
  const leader = await User.findById(leaderId);
  if (!leader || leader.role !== "team_leader") {
    console.log(`SKIPPED ${leaderProjects.length} project(s): leader ${leaderId} is not a Team Leader account.`);
    continue;
  }

  let team = await Team.findOne({ leader: leader._id });
  if (!team) {
    team = await Team.create({ teamName: `${leader.name}'s Team`, leader: leader._id, members: [] });
    console.log(`Created team "${team.teamName}"`);
  }

  const projectIds = leaderProjects.map((p) => p._id);
  const assignees = await Task.find({ project: { $in: projectIds }, assignedUser: { $ne: null } }).distinct("assignedUser");

  for (const id of assignees) {
    const person = await User.findById(id);
    if (!person || person.role !== "team_member") continue;
    if (team.members.some((m) => String(m) === String(id))) continue;
    const other = await Team.findOne({ members: id, _id: { $ne: team._id } });
    if (other) {
      console.log(`NOT ADDED: ${person.name} is already in "${other.teamName}" (a member can be in only one team). Sort this out on the Teams page.`);
      continue;
    }
    team.members.push(id);
    console.log(`Added ${person.name} to "${team.teamName}"`);
  }
  await team.save();

  await Project.updateMany({ _id: { $in: projectIds } }, { team: team._id });
  for (const p of leaderProjects) console.log(`Linked project "${p.title}" -> "${team.teamName}"`);
}

console.log("Done.");
await mongoose.disconnect();

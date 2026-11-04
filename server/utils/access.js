import Project from "../models/Project.js";
import Task from "../models/Task.js";
import DailyReport from "../models/DailyReport.js";

// Ids of the projects a Team Leader leads
export const leaderProjectIds = (userId) => Project.find({ leader: userId }).distinct("_id");

// Does this user lead this project?
export const leadsProject = async (userId, projectId) =>
  Boolean(projectId) && Boolean(await Project.exists({ _id: projectId, leader: userId }));

// A Mongo filter describing which attachments a user is allowed to see:
//  Manager     -> everything
//  Team Leader -> files on tasks/reports of projects they lead (plus their own uploads)
//  Team Member -> files on their own tasks/reports (plus their own uploads)
export async function attachmentAccessFilter(user) {
  if (user.role === "manager") return {};

  let taskIds;
  let reportIds;
  if (user.role === "team_leader") {
    const projectIds = await leaderProjectIds(user._id);
    [taskIds, reportIds] = await Promise.all([
      Task.find({ project: { $in: projectIds } }).distinct("_id"),
      DailyReport.find({ project: { $in: projectIds } }).distinct("_id"),
    ]);
  } else {
    [taskIds, reportIds] = await Promise.all([
      Task.find({ assignedUser: user._id }).distinct("_id"),
      DailyReport.find({ user: user._id }).distinct("_id"),
    ]);
  }

  return { $or: [{ uploadedBy: user._id }, { task: { $in: taskIds } }, { report: { $in: reportIds } }] };
}

// Phase 3 rules that keep reviews, reports and deletes consistent.
import Project from "../models/Project.js";
import Team from "../models/Team.js";
import Task from "../models/Task.js";
import DailyReport from "../models/DailyReport.js";
import Review from "../models/Review.js";
import Attachment from "../models/Attachment.js";

// Is this person part of this project? Yes if they are in the project's team,
// or they have (or had) a task in it — so past work can still be reviewed after a team change.
export async function workedOnProject(projectId, userId) {
  const project = await Project.findById(projectId).select("team");
  if (!project) return false;
  if (project.team && (await Team.exists({ _id: project.team, members: userId }))) return true;
  return Boolean(await Task.exists({ project: projectId, assignedUser: userId }));
}

// Delete tasks together with the files attached to them. Returns how many tasks were deleted.
export async function deleteTasksWithFiles(filter) {
  const ids = await Task.find(filter).distinct("_id");
  if (ids.length === 0) return 0;
  await Attachment.deleteMany({ task: { $in: ids } });
  await Task.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

// Clean up after a project is deleted:
//   - its tasks (and their files) are deleted — they make no sense without the project
//   - daily reports and reviews are KEPT as history, they just lose the link to the project
export async function cleanupProject(projectId) {
  const tasksDeleted = await deleteTasksWithFiles({ project: projectId });
  await DailyReport.updateMany({ project: projectId }, { $unset: { project: "" } });
  await Review.updateMany({ project: projectId }, { $unset: { project: "" } });
  return { tasksDeleted };
}

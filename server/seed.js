// Run with: npm run seed   (safe to re-run — it skips anything that already exists)
// Creates demo users for every role, plus a sample project with tasks (deadlines + proof links),
// a daily report, a review and notifications, so every dashboard has real data to show immediately.

import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Project from "./models/Project.js";
import Team from "./models/Team.js";
import Task from "./models/Task.js";
import DailyReport from "./models/DailyReport.js";
import Review from "./models/Review.js";
import Notification from "./models/Notification.js";

dotenv.config();

const demoUsers = [
  { name: "Asha Rao", email: "manager@nexora.test", password: "password123", role: "manager" },
  { name: "Vikram Shah", email: "leader@nexora.test", password: "password123", role: "team_leader" },
  { name: "joshua", email: "leader2@nexora.test", password: "password123", role: "team_leader" },
  { name: "Meera Nair", email: "member@nexora.test", password: "password123", role: "team_member" },
  { name: "Rohan Iyer", email: "member2@nexora.test", password: "password123", role: "team_member" },
];

// Deadlines are whole days (like the date picker produces), stored at UTC midnight
const daysFromNow = (n) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

// Create a document only if one matching `query` doesn't exist yet
async function ensure(Model, query, data, label) {
  const existing = await Model.findOne(query);
  if (existing) {
    console.log(`Already exists: ${label}`);
    return existing;
  }
  const created = await Model.create(data);
  console.log(`Created: ${label}`);
  return created;
}

const run = async () => {
  await connectDB();

  const byEmail = {};

  for (const u of demoUsers) {
    let user = await User.findOne({ email: u.email });
    if (user) {
      console.log(`Already exists: ${u.email} (${u.role})`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);
      user = await User.create({ ...u, password: hashedPassword });
      console.log(`Created: ${u.email} (${u.role})`);
    }
    byEmail[u.email] = user;
  }

  // The demo project is led by "joshua" (leader2) — same as earlier versions of this seed, where the
  // last Team Leader in the list ended up leading it. Vikram (leader@) has no project, which is a handy
  // way to show that a Team Leader only sees the projects they lead.
  const leader = byEmail["leader2@nexora.test"];
  const meera = byEmail["member@nexora.test"];
  const rohan = byEmail["member2@nexora.test"];

  const project = await ensure(
    Project,
    { title: "NexOra Demo Project" },
    {
      title: "NexOra Demo Project",
      description: "Sample project created by the seed script for demo purposes.",
      status: "ongoing",
      startDate: daysFromNow(-10),
      endDate: daysFromNow(14),
      leader: leader._id,
    },
    "sample project: NexOra Demo Project"
  );

  // Teams: joshua leads the demo team (Meera + Rohan) and it works on the demo project.
  // Vikram leads an empty team, so you can practise adding members on the Teams page.
  const demoTeam = await ensure(
    Team,
    { leader: leader._id }, // a leader leads at most one team
    { teamName: "NexOra Demo Team", leader: leader._id, members: [meera._id, rohan._id] },
    "team: NexOra Demo Team"
  );
  await ensure(
    Team,
    { leader: byEmail["leader@nexora.test"]._id },
    { teamName: "Platform Team", leader: byEmail["leader@nexora.test"]._id, members: [] },
    "team: Platform Team"
  );
  if (!project.team) {
    project.team = demoTeam._id;
    await project.save();
    console.log("Linked: NexOra Demo Project -> NexOra Demo Team");
  }

  const repoLink = "https://github.com/greesh1317/NexOra";

  await ensure(
    Task,
    { title: "Set up project repo", project: project._id },
    {
      title: "Set up project repo",
      project: project._id,
      assignedUser: meera._id,
      priority: "high",
      status: "in_progress",
      deadline: daysFromNow(2),
      submissionLink: repoLink,
    },
    "task: Set up project repo"
  );

  await ensure(
    Task,
    { title: "Design login screen", project: project._id },
    {
      title: "Design login screen",
      project: project._id,
      assignedUser: meera._id,
      priority: "medium",
      status: "completed",
      deadline: daysFromNow(-1),
      submissionLink: `${repoLink}/commits`,
    },
    "task: Design login screen"
  );

  await ensure(
    Task,
    { title: "Write API documentation", project: project._id },
    {
      title: "Write API documentation",
      project: project._id,
      assignedUser: rohan._id,
      priority: "medium",
      status: "not_started",
      deadline: daysFromNow(5),
    },
    "task: Write API documentation"
  );

  await ensure(
    DailyReport,
    { user: meera._id, workDone: "Finished the login screen styling and wired it to the auth API." },
    {
      user: meera._id,
      project: project._id,
      workDone: "Finished the login screen styling and wired it to the auth API.",
      hours: 4,
      submissionLink: `${repoLink}/commits?author=greesh1317`,
    },
    "daily report from Meera"
  );

  await ensure(
    Review,
    { reviewer: leader._id, employee: meera._id, comments: "Clean UI work and delivered ahead of the deadline." },
    {
      reviewer: leader._id,
      employee: meera._id,
      project: project._id,
      rating: 4,
      comments: "Clean UI work and delivered ahead of the deadline.",
    },
    "review for Meera"
  );

  await ensure(
    Notification,
    { recipient: meera._id, message: 'You were assigned a new task: "Set up project repo"' },
    { recipient: meera._id, type: "assignment", message: 'You were assigned a new task: "Set up project repo"' },
    "notification: task assigned (Meera)"
  );

  await ensure(
    Notification,
    { recipient: meera._id, type: "review" },
    {
      recipient: meera._id,
      type: "review",
      message: `${leader.name} left you a 4/5 review: "Clean UI work and delivered ahead of the deadline."`,
    },
    "notification: review received (Meera)"
  );

  await ensure(
    Notification,
    { recipient: rohan._id, message: 'You were assigned a new task: "Write API documentation"' },
    { recipient: rohan._id, type: "assignment", message: 'You were assigned a new task: "Write API documentation"' },
    "notification: task assigned (Rohan)"
  );

  console.log("\nDemo login credentials (same password for all):");
  demoUsers.forEach((u) => console.log(`  ${u.role.padEnd(12)} → ${u.email} / ${u.password}`));

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

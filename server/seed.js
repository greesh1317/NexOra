// Run with: node seed.js
// Creates one demo user per role (skips any that already exist by email),
// plus one sample project and one sample task, so Review 2 has real data
// to log in with and demo immediately.

import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Project from "./models/Project.js";
import Task from "./models/Task.js";

dotenv.config();

const demoUsers = [
  { name: "Asha Rao", email: "manager@nexora.test", password: "password123", role: "manager" },
  { name: "Vikram Shah", email: "leader@nexora.test", password: "password123", role: "team_leader" },
  { name: "joshua", email: "leader2@nexora.test", password: "password123", role: "team_leader" },
  { name: "Meera Nair", email: "member@nexora.test", password: "password123", role: "team_member" },
];

const run = async () => {
  await connectDB();
  const createdUsers = {};

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
    createdUsers[u.role] = user;
  }

  let project = await Project.findOne({ title: "NexOra Demo Project" });
  if (!project) {
    project = await Project.create({
      title: "NexOra Demo Project",
      description: "Sample project created by the seed script for Review 2 demo purposes.",
      status: "ongoing",
      leader: createdUsers.team_leader._id,
    });
    console.log("Created sample project: NexOra Demo Project");
  } else {
    console.log("Sample project already exists");
  }

  const existingTask = await Task.findOne({ title: "Set up project repo", project: project._id });
  if (!existingTask) {
    await Task.create({
      title: "Set up project repo",
      project: project._id,
      assignedUser: createdUsers.team_member._id,
      priority: "high",
      status: "in_progress",
    });
    console.log("Created sample task: Set up project repo");
  } else {
    console.log("Sample task already exists");
  }

  console.log("\nDemo login credentials (same password for all):");
  demoUsers.forEach((u) => console.log(`  ${u.role.padEnd(12)} → ${u.email} / ${u.password}`));

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

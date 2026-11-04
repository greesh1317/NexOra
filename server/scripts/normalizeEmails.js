// Run ONCE after this update:  npm run normalize-emails
// Logins are now case-insensitive, so every stored email must be lowercase.
// This script lowercases existing emails and reports (without changing) any duplicates.
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

await connectDB();

const users = await User.find().select("email");
const seen = new Map(users.map((u) => [u.email, u._id.toString()]));
let changed = 0;

for (const u of users) {
  const clean = u.email.trim().toLowerCase();
  if (clean === u.email) continue;
  const owner = seen.get(clean);
  if (owner && owner !== u._id.toString()) {
    console.log(`SKIPPED (duplicate): "${u.email}" collides with an existing "${clean}" — fix by hand.`);
    continue;
  }
  await User.updateOne({ _id: u._id }, { $set: { email: clean } });
  seen.set(clean, u._id.toString());
  console.log(`Updated: ${u.email} -> ${clean}`);
  changed += 1;
}

console.log(`Done. ${changed} email(s) updated.`);
await mongoose.disconnect();

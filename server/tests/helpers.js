import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/User.js";
import { signToken } from "../utils/token.js";

let mongod;
let counter = 0;

// A throw-away in-memory MongoDB, so tests never touch your real data
export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

// Reconnect to the same in-memory database (used to test recovery after an outage)
export async function reconnectDb() {
  await mongoose.connect(mongod.getUri());
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

export async function clearDb() {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
}

export async function makeUser(role, overrides = {}) {
  counter += 1;
  return User.create({
    name: `${role} ${counter}`,
    email: `${role}${counter}@test.com`,
    password: await bcrypt.hash("password123", 4),
    role,
    ...overrides,
  });
}

export const authHeader = (user) => ({ Authorization: `Bearer ${signToken(user._id)}` });

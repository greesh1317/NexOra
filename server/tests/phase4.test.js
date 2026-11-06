import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Team from "../models/Team.js";
import Notification from "../models/Notification.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const login = (email, password) => request(app).post("/api/auth/login").send({ email, password });
const reset = (by, target, newPassword) =>
  request(app).put(`/api/users/${target._id}/password`).set(authHeader(by)).send({ newPassword });

describe("manager password reset", () => {
  it("sets a new password, tells the person, and the old password stops working", async () => {
    const manager = await makeUser("manager");
    const member = await makeUser("team_member");

    const res = await reset(manager, member, "BrandNewPass9");
    expect(res.status).toBe(200);

    expect((await login(member.email, "password123")).status).toBe(401);
    const fresh = await login(member.email, "BrandNewPass9");
    expect(fresh.status).toBe(200);

    const note = await Notification.findOne({ recipient: member._id });
    expect(note.message).toMatch(/reset your password/);
  });

  it("ends sessions that started before the reset, but not new ones", async () => {
    const manager = await makeUser("manager");
    const member = await makeUser("team_member");
    // a token issued two minutes ago (before the reset)
    const oldToken = jwt.sign({ id: member._id, iat: Math.floor(Date.now() / 1000) - 120 }, process.env.JWT_SECRET);
    expect((await request(app).get("/api/tasks").set({ Authorization: `Bearer ${oldToken}` })).status).toBe(200);

    await reset(manager, member, "BrandNewPass9");

    expect((await request(app).get("/api/tasks").set({ Authorization: `Bearer ${oldToken}` })).status).toBe(401);
    const fresh = await login(member.email, "BrandNewPass9");
    // logging in straight after the reset must work, even within the same second
    expect((await request(app).get("/api/tasks").set({ Authorization: `Bearer ${fresh.body.token}` })).status).toBe(200);
  });

  it("is manager-only and validates its input", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const member = await makeUser("team_member");
    expect((await reset(leader, member, "BrandNewPass9")).status).toBe(403);
    expect((await reset(manager, member, "short")).status).toBe(400);
    expect((await reset(manager, manager, "BrandNewPass9")).status).toBe(400); // managers use the account menu
    const bad = await request(app).put("/api/users/not-an-id/password").set(authHeader(manager)).send({ newPassword: "BrandNewPass9" });
    expect(bad.status).toBe(400);
    const missing = await request(app).put("/api/users/64b64b64b64b64b64b64b64b/password").set(authHeader(manager)).send({ newPassword: "BrandNewPass9" });
    expect(missing.status).toBe(404);
  });

  it("does not break changing your own password (/me/password is not read as an id)", async () => {
    const member = await makeUser("team_member");
    const res = await request(app)
      .put("/api/users/me/password")
      .set(authHeader(member))
      .send({ currentPassword: "password123", newPassword: "MyOwnNewPass1" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password updated");
    expect((await login(member.email, "MyOwnNewPass1")).status).toBe(200);
  });
});

describe("reassigning tasks", () => {
  async function setup() {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const a = await makeUser("team_member");
    const b = await makeUser("team_member");
    const outsider = await makeUser("team_member");
    const team = await Team.create({ teamName: "A", leader: leader._id, members: [a._id, b._id] });
    const project = await Project.create({ title: "P", team: team._id, leader: leader._id });
    const task = await Task.create({ title: "Write docs", project: project._id, assignedUser: a._id });
    return { manager, leader, a, b, outsider, task };
  }
  const update = (by, task, body) => request(app).put(`/api/tasks/${task._id}`).set(authHeader(by)).send(body);

  it("notifies the new assignee, and only when the assignee changes", async () => {
    const { leader, b, task } = await setup();
    expect((await update(leader, task, { title: "Write the docs" })).status).toBe(200);
    expect(await Notification.countDocuments({ recipient: b._id })).toBe(0);

    expect((await update(leader, task, { assignedUser: b._id })).status).toBe(200);
    const notes = await Notification.find({ recipient: b._id });
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe("assignment");
    expect(notes[0].message).toMatch(/Write the docs/);
  });

  it("lets a manager reassign inside the team but not to an outsider", async () => {
    const { manager, b, outsider, task } = await setup();
    expect((await update(manager, task, { assignedUser: b._id })).status).toBe(200);
    expect((await update(manager, task, { assignedUser: outsider._id })).status).toBe(400);
  });

  it("lets a leader edit the deadline and priority and clear the deadline", async () => {
    const { leader, task } = await setup();
    const set = await update(leader, task, { deadline: "2026-12-31", priority: "high" });
    expect(set.status).toBe(200);
    expect(set.body.priority).toBe("high");
    const cleared = await update(leader, task, { deadline: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.deadline).toBeFalsy();
  });
});

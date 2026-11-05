import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Team from "../models/Team.js";
import User from "../models/User.js";
import { getJwtSecret } from "../utils/token.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe("authentication", () => {
  it("has no public registration route", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Evil", email: "evil@x.com", password: "password123", role: "manager" });
    expect(res.status).toBe(404);
    expect(await User.countDocuments()).toBe(0);
  });

  it("logs in with correct password, and email is case-insensitive", async () => {
    await makeUser("manager", { email: "boss@test.com" });
    const res = await request(app).post("/api/auth/login").send({ email: "  BOSS@Test.com ", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe("manager");
  });

  it("rejects a wrong password and missing fields", async () => {
    await makeUser("manager", { email: "boss@test.com" });
    const bad = await request(app).post("/api/auth/login").send({ email: "boss@test.com", password: "nope" });
    expect(bad.status).toBe(401);
    const missing = await request(app).post("/api/auth/login").send({ email: "boss@test.com" });
    expect(missing.status).toBe(400);
  });

  it("returns 401 (not 500) for a valid token whose account was deleted", async () => {
    const ghost = await makeUser("team_member");
    const headers = authHeader(ghost);
    await User.deleteOne({ _id: ghost._id });
    const res = await request(app).get("/api/tasks").set(headers);
    expect(res.status).toBe(401);
  });

  it("refuses to work without JWT_SECRET", () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
    process.env.JWT_SECRET = saved;
  });
});

describe("users", () => {
  it("blocks team members from listing users", async () => {
    const member = await makeUser("team_member");
    const res = await request(app).get("/api/users").set(authHeader(member));
    expect(res.status).toBe(403);
  });

  it("lets a team leader see only members of their own team, never managers", async () => {
    const leader = await makeUser("team_leader");
    await makeUser("manager");
    const mine = await makeUser("team_member");
    await makeUser("team_member"); // not in the leader's team: must stay hidden
    await Team.create({ teamName: "T", leader: leader._id, members: [mine._id] });
    const res = await request(app).get("/api/users?role=manager").set(authHeader(leader));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body.every((u) => u.role === "team_member")).toBe(true);
    expect(res.body[0].password).toBeUndefined();
  });

  it("lets a manager see everyone", async () => {
    const manager = await makeUser("manager");
    await makeUser("team_leader");
    await makeUser("team_member");
    const res = await request(app).get("/api/users").set(authHeader(manager));
    expect(res.body.length).toBe(3);
  });

  it("requires an 8+ character password when a manager creates an account", async () => {
    const manager = await makeUser("manager");
    const res = await request(app)
      .post("/api/users")
      .set(authHeader(manager))
      .send({ name: "New", email: "NEW@test.com", password: "short", role: "team_member" });
    expect(res.status).toBe(400);
    const ok = await request(app)
      .post("/api/users")
      .set(authHeader(manager))
      .send({ name: "New", email: "NEW@test.com", password: "longenough1", role: "team_member" });
    expect(ok.status).toBe(201);
    expect(ok.body.email).toBe("new@test.com");
  });
});

describe("projects and teams", () => {
  it("shows a team member only projects where they have a task", async () => {
    const member = await makeUser("team_member");
    const leader = await makeUser("team_leader");
    const mine = await Project.create({ title: "Mine", leader: leader._id });
    await Project.create({ title: "Not mine", leader: leader._id });
    await Task.create({ title: "t", project: mine._id, assignedUser: member._id });
    const res = await request(app).get("/api/projects").set(authHeader(member));
    expect(res.body.map((p) => p.title)).toEqual(["Mine"]);
  });

  it("rejects a non-leader as project leader", async () => {
    const manager = await makeUser("manager");
    const member = await makeUser("team_member");
    const res = await request(app)
      .post("/api/projects")
      .set(authHeader(manager))
      .send({ title: "P", leader: member._id });
    expect(res.status).toBe(400);
  });

  it("shows teams only to the people they concern", async () => {
    const manager = await makeUser("manager");
    const leader = await makeUser("team_leader");
    const otherLeader = await makeUser("team_leader");
    const member = await makeUser("team_member");
    const outsider = await makeUser("team_member");
    await Team.create({ teamName: "Alpha", leader: leader._id, members: [member._id] });
    await Team.create({ teamName: "Beta", leader: otherLeader._id, members: [] });

    const names = async (u) => (await request(app).get("/api/teams").set(authHeader(u))).body.map((t) => t.teamName);
    expect(await names(manager)).toHaveLength(2);
    expect(await names(leader)).toEqual(["Alpha"]);
    expect(await names(member)).toEqual(["Alpha"]);
    expect(await names(outsider)).toEqual([]);
  });
});

describe("tasks and analytics", () => {
  it("stops a leader moving a task into a project they do not lead", async () => {
    const leader = await makeUser("team_leader");
    const other = await makeUser("team_leader");
    const mine = await Project.create({ title: "Mine", leader: leader._id });
    const theirs = await Project.create({ title: "Theirs", leader: other._id });
    const task = await Task.create({ title: "t", project: mine._id });
    const res = await request(app).put(`/api/tasks/${task._id}`).set(authHeader(leader)).send({ project: theirs._id });
    expect(res.status).toBe(403);
    expect((await Task.findById(task._id)).project.toString()).toBe(mine._id.toString());
  });

  it("still lets a leader edit tasks inside their own project", async () => {
    const leader = await makeUser("team_leader");
    const mine = await Project.create({ title: "Mine", leader: leader._id });
    const task = await Task.create({ title: "old", project: mine._id });
    const res = await request(app).put(`/api/tasks/${task._id}`).set(authHeader(leader)).send({ title: "new", priority: "high" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("new");
  });

  it("lets an assignee change only status and proof link", async () => {
    const member = await makeUser("team_member");
    const task = await Task.create({ title: "keep", assignedUser: member._id });
    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .set(authHeader(member))
      .send({ title: "hacked", status: "in_progress" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("keep");
    expect(res.body.status).toBe("in_progress");
  });

  it("blocks team members from project analytics", async () => {
    const member = await makeUser("team_member");
    const leader = await makeUser("team_leader");
    const project = await Project.create({ title: "P", leader: leader._id });
    const res = await request(app).get(`/api/analytics/project/${project._id}`).set(authHeader(member));
    expect(res.status).toBe(403);
  });
});

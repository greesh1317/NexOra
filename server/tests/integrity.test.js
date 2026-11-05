import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Team from "../models/Team.js";
import DailyReport from "../models/DailyReport.js";
import Review from "../models/Review.js";
import Attachment from "../models/Attachment.js";
import User from "../models/User.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

// manager + a leader with a team (one member) + a project for that team + an outsider
async function world() {
  const manager = await makeUser("manager");
  const leader = await makeUser("team_leader");
  const member = await makeUser("team_member");
  const outsider = await makeUser("team_member");
  const team = await Team.create({ teamName: "A", leader: leader._id, members: [member._id] });
  const project = await Project.create({ title: "P", team: team._id, leader: leader._id });
  return { manager, leader, member, outsider, team, project };
}

const postReview = (user, body) => request(app).post("/api/reviews").set(authHeader(user)).send(body);
const postReport = (user, body) => request(app).post("/api/reports").set(authHeader(user)).send(body);

describe("reviews", () => {
  it("lets a leader review a team member on their project", async () => {
    const { leader, member, project } = await world();
    const res = await postReview(leader, { employee: member._id, project: project._id, rating: 4, comments: "Good" });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(4);
  });

  it("only allows reviews about Team Members", async () => {
    const { leader, manager, project } = await world();
    const res = await postReview(leader, { employee: manager._id, project: project._id, rating: 4 });
    expect(res.status).toBe(400);
  });

  it("rejects someone who is not part of the project", async () => {
    const { leader, outsider, project } = await world();
    const res = await postReview(leader, { employee: outsider._id, project: project._id, rating: 4 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not part/);
  });

  it("still allows reviewing past work by someone who has a task but left the team", async () => {
    const { leader, outsider, project } = await world();
    await Task.create({ title: "old", project: project._id, assignedUser: outsider._id });
    const res = await postReview(leader, { employee: outsider._id, project: project._id, rating: 3 });
    expect(res.status).toBe(201);
  });

  it("without a project, a leader may only review their own team", async () => {
    const { leader, member, outsider } = await world();
    expect((await postReview(leader, { employee: member._id, rating: 5 })).status).toBe(201);
    expect((await postReview(leader, { employee: outsider._id, rating: 5 })).status).toBe(403);
  });

  it("stops a leader reviewing on a project they do not lead", async () => {
    const { leader, member } = await world();
    const otherLeader = await makeUser("team_leader");
    const theirs = await Project.create({ title: "Theirs", leader: otherLeader._id });
    const res = await postReview(leader, { employee: member._id, project: theirs._id, rating: 5 });
    expect(res.status).toBe(403);
  });

  it("accepts every rating from 1 to 5", async () => {
    const { manager, member } = await world();
    for (const rating of [1, 2, 3, 4, 5]) {
      expect((await postReview(manager, { employee: member._id, rating })).status).toBe(201);
    }
  });

  it("validates the rating and the ids", async () => {
    const { manager, member } = await world();
    for (const rating of [0, 6, 3.5, "abc"]) {
      expect((await postReview(manager, { employee: member._id, rating })).status).toBe(400);
    }
    expect((await postReview(manager, { employee: member._id })).status).toBe(400);
    expect((await postReview(manager, { employee: "not-an-id", rating: 4 })).status).toBe(400);
  });

  it("lets a manager review any team member without a project", async () => {
    const { manager, outsider } = await world();
    expect((await postReview(manager, { employee: outsider._id, rating: 2 })).status).toBe(201);
  });
});

describe("daily reports", () => {
  it("lets a team member report on their project, even before they have a task", async () => {
    const { member, project } = await world();
    const res = await postReport(member, { project: project._id, workDone: "Setup", hours: 4 });
    expect(res.status).toBe(201);
  });

  it("shows a team member their team's project (for the report dropdown) before any task exists", async () => {
    const { member, outsider, project } = await world();
    const mine = await request(app).get("/api/projects").set(authHeader(member));
    expect(mine.body.map((p) => p._id)).toEqual([project._id.toString()]);
    const theirs = await request(app).get("/api/projects").set(authHeader(outsider));
    expect(theirs.body).toHaveLength(0);
  });

  it("accepts the hour limits 0 and 24 and rejects anything above 24", async () => {
    const { member, project } = await world();
    for (const hours of [0, 24]) {
      expect((await postReport(member, { project: project._id, workDone: "x", hours })).status).toBe(201);
    }
    expect((await postReport(member, { project: project._id, workDone: "x", hours: 24.5 })).status).toBe(400);
  });

  it("lets a leader report on a project they lead", async () => {
    const { leader, project } = await world();
    expect((await postReport(leader, { project: project._id, workDone: "Planning" })).status).toBe(201);
  });

  it("blocks reporting on a project you are not part of", async () => {
    const { outsider, project } = await world();
    const res = await postReport(outsider, { project: project._id, workDone: "Sneaky" });
    expect(res.status).toBe(403);
  });

  it("rejects impossible hours", async () => {
    const { member, project } = await world();
    for (const hours of [-1, 25, "abc"]) {
      expect((await postReport(member, { project: project._id, workDone: "x", hours })).status).toBe(400);
    }
  });

  it("stops a leader reporting on a project they do not lead", async () => {
    const { leader } = await world();
    const other = await makeUser("team_leader");
    const theirs = await Project.create({ title: "Theirs", leader: other._id });
    expect((await postReport(leader, { project: theirs._id, workDone: "x" })).status).toBe(403);
  });
});

describe("cleanup when things are deleted", () => {
  const file = (uploadedBy, extra) =>
    Attachment.create({ filename: "a.txt", size: 1, data: Buffer.from("x"), uploadedBy, ...extra });

  it("deleting a project removes its tasks and task files, but keeps reports and reviews", async () => {
    const { manager, member, project } = await world();
    const t1 = await Task.create({ title: "1", project: project._id, assignedUser: member._id });
    await Task.create({ title: "2", project: project._id, assignedUser: member._id });
    const otherProject = await Project.create({ title: "Other" });
    await Task.create({ title: "keep me", project: otherProject._id });
    await file(member._id, { task: t1._id });
    const report = await DailyReport.create({ user: member._id, project: project._id, workDone: "w" });
    const review = await Review.create({ reviewer: manager._id, employee: member._id, project: project._id, rating: 5 });

    const res = await request(app).delete(`/api/projects/${project._id}`).set(authHeader(manager));
    expect(res.status).toBe(200);
    expect(res.body.tasksDeleted).toBe(2);

    expect(await Task.countDocuments({ project: project._id })).toBe(0);
    expect(await Task.countDocuments({ project: otherProject._id })).toBe(1);
    expect(await Attachment.countDocuments()).toBe(0);
    expect((await DailyReport.findById(report._id)).project).toBeUndefined();
    expect((await Review.findById(review._id)).project).toBeUndefined();
  });

  it("only a manager can delete a project, and bad ids are rejected", async () => {
    const { leader, manager, project } = await world();
    expect((await request(app).delete(`/api/projects/${project._id}`).set(authHeader(leader))).status).toBe(403);
    expect((await request(app).delete("/api/projects/not-an-id").set(authHeader(manager))).status).toBe(400);
  });

  it("deleting a task removes its files", async () => {
    const { leader, member, project } = await world();
    const task = await Task.create({ title: "t", project: project._id, assignedUser: member._id });
    await file(member._id, { task: task._id });
    const res = await request(app).delete(`/api/tasks/${task._id}`).set(authHeader(leader));
    expect(res.status).toBe(200);
    expect(await Attachment.countDocuments()).toBe(0);
  });
});

describe("deactivating accounts", () => {
  const login = (user) => request(app).post("/api/auth/login").send({ email: user.email, password: "password123" });
  const setStatus = (by, target, body) =>
    request(app).put(`/api/users/${target._id}/status`).set(authHeader(by)).send(body);

  it("blocks login and existing sessions, and can be undone", async () => {
    const { manager, member } = await world();
    const oldToken = authHeader(member);
    expect((await login(member)).status).toBe(200);

    const off = await setStatus(manager, member, { isActive: false });
    expect(off.status).toBe(200);
    expect(off.body.isActive).toBe(false);
    expect(off.body.password).toBeUndefined();

    const blocked = await login(member);
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toMatch(/deactivated/);
    expect((await request(app).get("/api/tasks").set(oldToken)).status).toBe(401);

    await setStatus(manager, member, { isActive: true });
    expect((await login(member)).status).toBe(200);
  });

  it("is manager-only, needs a boolean, and never applies to managers", async () => {
    const { manager, leader, member } = await world();
    expect((await setStatus(leader, member, { isActive: false })).status).toBe(403);
    expect((await setStatus(manager, member, { isActive: "no" })).status).toBe(400);
    expect((await setStatus(manager, manager, { isActive: false })).status).toBe(400);
    const bad = await request(app).put("/api/users/not-an-id/status").set(authHeader(manager)).send({ isActive: false });
    expect(bad.status).toBe(400);
  });

  it("keeps deactivated people out of new tasks and out of a leader's list", async () => {
    const { manager, leader, member, project } = await world();
    await setStatus(manager, member, { isActive: false });

    const task = await request(app)
      .post("/api/tasks")
      .set(authHeader(leader))
      .send({ title: "t", project: project._id, assignedUser: member._id });
    expect(task.status).toBe(400);
    expect(task.body.message).toMatch(/deactivated/);

    const list = await request(app).get("/api/users").set(authHeader(leader));
    expect(list.body).toHaveLength(0);
    expect(await User.countDocuments({ isActive: false })).toBe(1); // still exists, history kept
  });
});

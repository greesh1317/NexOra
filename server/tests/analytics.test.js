import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const DAY = 24 * 60 * 60 * 1000;
const get = (user, url) => request(app).get(url).set(authHeader(user));

async function world() {
  const manager = await makeUser("manager");
  const leader = await makeUser("team_leader");
  const otherLeader = await makeUser("team_leader");
  const amy = await makeUser("team_member", { name: "Amy Test" });
  const P = await Project.create({ title: "P", leader: leader._id });
  const Q = await Project.create({ title: "Q", leader: otherLeader._id });
  await Task.create({ title: "A done", project: P._id, assignedUser: amy._id, status: "completed", completedAt: new Date() });
  await Task.create({ title: "B late", project: P._id, assignedUser: amy._id, status: "in_progress", deadline: new Date(Date.now() - 3 * DAY) });
  await Task.create({ title: "C stuck", project: P._id, assignedUser: amy._id, status: "blocked" });
  await Task.create({ title: "D soon", project: P._id, deadline: new Date(Date.now() + 2 * DAY) });
  await Task.create({ title: "E other project", project: Q._id });
  return { manager, leader, otherLeader, amy, P, Q };
}

describe("project analytics", () => {
  it("keeps the old figures and adds overdue, due soon, trend and workload", async () => {
    const { manager, P } = await world();
    const res = await get(manager, `/api/analytics/project/${P._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, completionRate: 25, overdue: 1, dueSoon: 1 });
    expect(res.body.byStatus).toEqual({ not_started: 1, in_progress: 1, completed: 1, blocked: 1 });
    expect(res.body.weeklyTrend).toHaveLength(6);
    expect(res.body.weeklyTrend[5].completed).toBe(1); // finished this week
    expect(res.body.byPerson[0]).toMatchObject({ name: "Amy Test", total: 3, completed: 1, open: 2, overdue: 1, blocked: 1 });
    expect(res.body.overdueList).toHaveLength(1);
    expect(res.body.overdueList[0]).toMatchObject({ title: "B late", project: "P", assignedTo: "Amy Test" });
  });

  it("counts older completed tasks (no completedAt) in the week they were last edited", async () => {
    const { manager, P } = await world();
    await Task.collection.insertOne({ title: "legacy", project: P._id, status: "completed", priority: "medium", createdAt: new Date(), updatedAt: new Date() });
    const res = await get(manager, `/api/analytics/project/${P._id}`);
    expect(res.body.weeklyTrend[5].completed).toBe(2);
  });

  it("answers 400 for a bad project id, and keeps the permission rules", async () => {
    const { manager, leader, amy, P, Q } = await world();
    expect((await get(manager, "/api/analytics/project/not-an-id")).status).toBe(400);
    expect((await get(leader, `/api/analytics/project/${P._id}`)).status).toBe(200);
    expect((await get(leader, `/api/analytics/project/${Q._id}`)).status).toBe(403);
    expect((await get(amy, `/api/analytics/project/${P._id}`)).status).toBe(403);
  });
});

describe("organisation analytics", () => {
  it("shows overdue overall, with a small row per project, for managers only", async () => {
    const { manager, leader } = await world();
    const res = await get(manager, "/api/analytics/overview");
    expect(res.status).toBe(200);
    expect(res.body.overall).toMatchObject({ total: 5, overdue: 1 });
    expect(res.body.byProject).toHaveLength(2);
    expect(res.body.byProject[0].overdueList).toBeUndefined(); // per-project rows stay small
    expect(res.body.byProject.find((p) => p.title === "P")).toMatchObject({ total: 4, overdue: 1 });
    expect((await get(leader, "/api/analytics/overview")).status).toBe(403);
  });
});

describe("remembering when a task was completed", () => {
  it("sets completedAt when a task is completed and clears it when reopened", async () => {
    const { amy, P } = await world();
    const task = await Task.create({ title: "x", project: P._id, assignedUser: amy._id });
    const put = (status) => request(app).put(`/api/tasks/${task._id}`).set(authHeader(amy)).send({ status });

    expect((await put("completed")).status).toBe(200);
    const done = await Task.findById(task._id);
    expect(done.completedAt).toBeInstanceOf(Date);
    const firstStamp = done.completedAt.getTime();

    await put("completed"); // saving "completed" again must not move the date
    expect((await Task.findById(task._id)).completedAt.getTime()).toBe(firstStamp);

    await put("in_progress");
    expect((await Task.findById(task._id)).completedAt).toBeNull();
  });
});

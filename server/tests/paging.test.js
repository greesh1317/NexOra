import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import Team from "../models/Team.js";
import DailyReport from "../models/DailyReport.js";
import Review from "../models/Review.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const get = (user, url) => request(app).get(url).set(authHeader(user));

// manager + a leader with 25 tasks in project P (3 of them Dino's) + another leader with 3 tasks in Q
async function world() {
  const manager = await makeUser("manager");
  const leader = await makeUser("team_leader");
  const otherLeader = await makeUser("team_leader");
  const dino = await makeUser("team_member", { name: "Dino Rossi" });
  const steve = await makeUser("team_member", { name: "Steve Hart" });
  const team = await Team.create({ teamName: "A", leader: leader._id, members: [dino._id, steve._id] });
  const P = await Project.create({ title: "P", team: team._id, leader: leader._id });
  const Q = await Project.create({ title: "Q", leader: otherLeader._id });
  const tasks = [];
  for (let i = 1; i <= 25; i++) {
    tasks.push({
      title: `Task ${String(i).padStart(2, "0")}`,
      project: P._id,
      assignedUser: i <= 3 ? dino._id : steve._id,
      status: i <= 5 ? "completed" : "not_started",
    });
  }
  for (let i = 1; i <= 3; i++) tasks.push({ title: `Other ${i}`, project: Q._id });
  await Task.insertMany(tasks);
  return { manager, leader, otherLeader, dino, steve, team, P, Q };
}

describe("paging", () => {
  it("answers with a plain array when no page is asked for (old behaviour)", async () => {
    const { manager } = await world();
    const res = await get(manager, "/api/tasks");
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(28);
  });

  it("returns pages with totals", async () => {
    const { manager } = await world();
    const first = (await get(manager, "/api/tasks?page=1&limit=10")).body;
    expect(first).toMatchObject({ total: 28, page: 1, limit: 10, pages: 3 });
    expect(first.items).toHaveLength(10);
    const last = (await get(manager, "/api/tasks?page=3&limit=10")).body;
    expect(last.items).toHaveLength(8);
    const beyond = (await get(manager, "/api/tasks?page=9&limit=10")).body;
    expect(beyond.items).toHaveLength(0);
    expect(beyond.total).toBe(28);
  });

  it("keeps limits sane and ignores nonsense", async () => {
    const { manager } = await world();
    expect((await get(manager, "/api/tasks?page=1&limit=1000")).body.limit).toBe(100);
    expect((await get(manager, "/api/tasks?page=0&limit=5")).body.page).toBe(1);
    const junk = (await get(manager, "/api/tasks?page=abc&limit=abc")).body;
    expect(junk).toMatchObject({ page: 1, limit: 20 });
  });

  it("does not repeat or skip rows between pages", async () => {
    const { manager } = await world();
    const ids = [];
    for (const page of [1, 2, 3]) {
      (await get(manager, `/api/tasks?page=${page}&limit=10`)).body.items.forEach((t) => ids.push(t._id));
    }
    expect(new Set(ids).size).toBe(28);
  });
});

describe("filters work across the whole list, not just one page", () => {
  it("searches task titles and assignee names", async () => {
    const { manager } = await world();
    expect((await get(manager, "/api/tasks?page=1&limit=5&search=Task 07")).body.total).toBe(1);
    const byName = (await get(manager, "/api/tasks?page=1&limit=5&search=dino")).body;
    expect(byName.total).toBe(3);
    expect(byName.items).toHaveLength(3);
  });

  it("treats special characters in the search literally (no crash)", async () => {
    const { manager } = await world();
    const res = await get(manager, "/api/tasks?page=1&limit=5&search=(");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it("filters by status and project together", async () => {
    const { manager, P } = await world();
    const res = (await get(manager, `/api/tasks?page=1&limit=50&status=completed&project=${P._id}`)).body;
    expect(res.total).toBe(5);
  });

  it("still limits a leader to their own projects, and counts only what they may see", async () => {
    const { leader } = await world();
    const res = (await get(leader, "/api/tasks?page=1&limit=10")).body;
    expect(res.total).toBe(25); // not 28
    expect(res.items.every((t) => t.project.title === "P")).toBe(true);
  });

  it("answers 400, not a crash, for a bad project id", async () => {
    const { manager } = await world();
    expect((await get(manager, "/api/tasks?page=1&project=nope")).status).toBe(400);
    expect((await get(manager, "/api/reports?page=1&project=nope")).status).toBe(400);
    expect((await get(manager, "/api/reviews?page=1&project=nope")).status).toBe(400);
  });
});

describe("reports and reviews", () => {
  it("lets a manager list history whose project was deleted, but nobody else", async () => {
    const { manager, leader, dino, P } = await world();
    await DailyReport.create({ user: dino._id, project: P._id, workDone: "with project" });
    await DailyReport.create({ user: dino._id, workDone: "orphan report" });
    await Review.create({ reviewer: manager._id, employee: dino._id, rating: 4, comments: "orphan review" });
    await Review.create({ reviewer: manager._id, employee: dino._id, project: P._id, rating: 5, comments: "linked review" });

    expect((await get(manager, "/api/reports?page=1&project=none")).body.total).toBe(1);
    expect((await get(manager, "/api/reviews?page=1&project=none")).body.total).toBe(1);
    expect((await get(leader, "/api/reports?page=1&project=none")).body.total).toBe(0);
    expect((await get(leader, "/api/reviews?page=1&project=none")).status).toBe(400);
  });

  it("searches report text and review comments or names", async () => {
    const { manager, leader, dino, steve, P } = await world();
    await DailyReport.create({ user: dino._id, project: P._id, workDone: "Fixed the login bug" });
    await DailyReport.create({ user: steve._id, project: P._id, workDone: "Wrote docs" });
    await Review.create({ reviewer: leader._id, employee: dino._id, project: P._id, rating: 4, comments: "Careful work" });
    await Review.create({ reviewer: leader._id, employee: steve._id, project: P._id, rating: 3, comments: "Fine" });

    expect((await get(manager, "/api/reports?page=1&search=login")).body.total).toBe(1);
    expect((await get(manager, "/api/reports?page=1&search=steve")).body.total).toBe(1);
    expect((await get(manager, "/api/reviews?page=1&search=careful")).body.total).toBe(1);
    expect((await get(manager, "/api/reviews?page=1&search=steve")).body.total).toBe(1);
  });
});

describe("users", () => {
  it("filters people by role, status and search, one page at a time", async () => {
    const { manager, steve } = await world();
    await request(app).put(`/api/users/${steve._id}/status`).set(authHeader(manager)).send({ isActive: false });

    const inactive = (await get(manager, "/api/users?page=1&limit=10&status=inactive")).body;
    expect(inactive.total).toBe(1);
    expect(inactive.items[0].name).toBe("Steve Hart");
    expect(inactive.items[0].password).toBeUndefined();

    const active = (await get(manager, "/api/users?page=1&limit=2&status=active")).body;
    expect(active.total).toBe(4);
    expect(active.items).toHaveLength(2);
    expect((await get(manager, "/api/users?page=1&role=team_leader")).body.total).toBe(2);
    expect((await get(manager, "/api/users?page=1&search=rossi")).body.total).toBe(1);
  });

  it("keeps a leader's paged list limited to their own active team members", async () => {
    const { manager, leader, steve } = await world();
    await request(app).put(`/api/users/${steve._id}/status`).set(authHeader(manager)).send({ isActive: false });
    const res = (await get(leader, "/api/users?page=1&limit=10&status=inactive")).body; // a leader cannot widen it
    expect(res.total).toBe(1);
    expect(res.items[0].name).toBe("Dino Rossi");
  });
});

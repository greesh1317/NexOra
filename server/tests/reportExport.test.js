import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import DailyReport from "../models/DailyReport.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const DAY = 24 * 60 * 60 * 1000;
const json = (user, query = "") => request(app).get(`/api/analytics/report${query}`).set(authHeader(user));
// The CSV is read as raw bytes, so the byte-order mark can be checked too
const csv = (user, query = "") =>
  request(app)
    .get(`/api/analytics/report.csv${query}`)
    .set(authHeader(user))
    .buffer(true)
    .parse((res, done) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => done(null, Buffer.concat(chunks)));
    });

async function world() {
  const manager = await makeUser("manager", { name: "Boss Person" });
  const leader = await makeUser("team_leader");
  const otherLeader = await makeUser("team_leader");
  const amy = await makeUser("team_member", { name: "Amy Test" });
  const P = await Project.create({ title: "Website Redesign", leader: leader._id });
  const Q = await Project.create({ title: "Q", leader: otherLeader._id });
  await Task.create({ title: "A done", project: P._id, assignedUser: amy._id, status: "completed", completedAt: new Date() });
  await Task.create({ title: "B late", project: P._id, assignedUser: amy._id, status: "in_progress", deadline: new Date(Date.now() - 3 * DAY) });
  await Task.create({ title: "C stuck", project: P._id, assignedUser: amy._id, status: "blocked" });
  await Task.create({ title: "D soon", project: P._id, deadline: new Date(Date.now() + 2 * DAY) });
  await Task.create({ title: "Q secret task", project: Q._id });
  await DailyReport.create({ user: amy._id, project: P._id, workDone: "Recent work", hours: 3 });
  await DailyReport.create({ user: amy._id, project: P._id, workDone: "Older work", hours: 2, date: new Date(Date.now() - 10 * DAY) });
  return { manager, leader, otherLeader, amy, P, Q };
}

describe("report data", () => {
  it("summarises one project for the last 7 days", async () => {
    const { manager, P } = await world();
    const res = await json(manager, `?project=${P._id}&period=week`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ project: "Website Redesign", period: "week", periodLabel: "Last 7 days", generatedBy: "Boss Person" });
    expect(res.body.summary).toMatchObject({
      totalTasks: 4, completed: 1, inProgress: 1, blocked: 1, notStarted: 1, completionRate: 25,
      overdue: 1, dueSoon: 1, completedInPeriod: 1, createdInPeriod: 4, reportsInPeriod: 1, hoursInPeriod: 3,
    });
    expect(res.body.tasks).toHaveLength(4);
    expect(res.body.tasks.find((t) => t.title === "B late")).toMatchObject({ assignedTo: "Amy Test", overdue: true });
    expect(res.body.reports).toHaveLength(1);
  });

  it("includes older daily reports when the period is a month", async () => {
    const { manager, P } = await world();
    const res = await json(manager, `?project=${P._id}&period=month`);
    expect(res.body.meta.periodLabel).toBe("Last 30 days");
    expect(res.body.summary).toMatchObject({ reportsInPeriod: 2, hoursInPeriod: 5 });
  });

  it("covers every project for a manager who chooses none", async () => {
    const { manager } = await world();
    const res = await json(manager);
    expect(res.body.meta.project).toBe("All projects");
    expect(res.body.summary.totalTasks).toBe(5);
  });
});

describe("who may see which report", () => {
  it("limits a leader to the projects they lead", async () => {
    const { leader, P, Q } = await world();
    const own = await json(leader, `?project=${P._id}`);
    expect(own.status).toBe(200);
    const all = await json(leader); // no project chosen = all of their projects
    expect(all.body.meta.project).toBe("All my projects");
    expect(all.body.tasks.map((t) => t.title)).not.toContain("Q secret task");
    expect(all.body.summary.totalTasks).toBe(4);
    expect((await json(leader, `?project=${Q._id}`)).status).toBe(403);
  });

  it("blocks team members and anonymous visitors", async () => {
    const { amy, P } = await world();
    expect((await json(amy, `?project=${P._id}`)).status).toBe(403);
    expect((await csv(amy, `?project=${P._id}`)).status).toBe(403);
    expect((await request(app).get("/api/analytics/report")).status).toBe(401);
  });

  it("answers clearly for bad input instead of crashing", async () => {
    const { manager } = await world();
    expect((await json(manager, "?period=year")).status).toBe(400);
    expect((await json(manager, "?project=nope")).status).toBe(400);
    expect((await json(manager, "?project=64b64b64b64b64b64b64b64b")).status).toBe(404);
  });
});

describe("CSV download", () => {
  it("is a real download: right type, a safe file name, a BOM, and every section", async () => {
    const { manager, P } = await world();
    const res = await csv(manager, `?project=${P._id}&period=week`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="nexora-report-website-redesign-week-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect([...res.body.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM, so Excel shows accents correctly

    const text = res.body.toString("utf8");
    for (const heading of ["SUMMARY", "WORKLOAD", "TASKS", "DAILY REPORTS"]) expect(text).toContain(heading);
    expect(text).toContain("A done");
    expect(text).toContain("Recent work");
    expect(text).not.toContain("Older work"); // outside the 7-day period
    expect(text).not.toContain("Q secret task");
  });

  it("shows the same numbers as the on-screen report", async () => {
    const { manager, P } = await world();
    const query = `?project=${P._id}&period=week`;
    const data = (await json(manager, query)).body.summary;
    const text = (await csv(manager, query)).body.toString("utf8");
    const value = (label) => text.split("\r\n").find((line) => line.startsWith(`${label},`)).split(",")[1];

    expect(Number(value("Total tasks"))).toBe(data.totalTasks);
    expect(Number(value("Completion rate (%)"))).toBe(data.completionRate);
    expect(Number(value("Overdue"))).toBe(data.overdue);
    expect(Number(value("Hours reported in this period"))).toBe(data.hoursInPeriod);
  });

  it("escapes awkward text and neutralises spreadsheet formulas", async () => {
    const { manager, amy, P } = await world();
    await DailyReport.create({ user: amy._id, project: P._id, workDone: '=HYPERLINK("http://evil.example","click")' });
    await DailyReport.create({ user: amy._id, project: P._id, workDone: 'Fixed login, signup and "reset"\nthen deployed' });
    const text = (await csv(manager, `?project=${P._id}&period=week`)).body.toString("utf8");

    expect(text).toContain(`"'=HYPERLINK(""http://evil.example"",""click"")"`); // shown as text, never run as a formula
    expect(text).not.toMatch(/,=HYPERLINK/);
    expect(text).toContain('"Fixed login, signup and ""reset""\nthen deployed"'); // commas, quotes and line breaks kept intact
  });

  it("keeps a leader's file inside their own projects", async () => {
    const { leader } = await world();
    const text = (await csv(leader)).body.toString("utf8");
    expect(text).toContain("All my projects");
    expect(text).toContain("A done");
    expect(text).not.toContain("Q secret task");
  });
});

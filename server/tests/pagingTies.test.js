import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import DailyReport from "../models/DailyReport.js";
import Review from "../models/Review.js";
import { startDb, stopDb, clearDb, makeUser, authHeader } from "./helpers.js";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

// Every row below has EXACTLY the same value in the field the list is sorted by.
// Without a tie-breaker MongoDB may order such rows differently on every request,
// so pages repeat some rows and skip others. These tests make that impossible to reintroduce.

const SAME_TIME = new Date("2026-01-15T10:00:00.000Z");
const COUNT = 25;

// Read every page (10 rows each) and return all ids in the order they were delivered
async function walk(user, url) {
  const ids = [];
  let page = 1;
  let pages = 1;
  let total = 0;
  do {
    const res = (await request(app).get(`${url}?page=${page}&limit=10`).set(authHeader(user))).body;
    res.items.forEach((row) => ids.push(row._id));
    pages = res.pages;
    total = res.total;
    page += 1;
  } while (page <= pages);
  return { ids, total };
}

// `outsideTie` = ids of rows that do NOT share the tied value (e.g. the manager, whose name differs).
// They sort by their own value, so only the tied rows are expected to follow the _id order.
async function expectStablePaging(user, url, expectedCount, direction, outsideTie = []) {
  const first = await walk(user, url);
  const second = await walk(user, url);

  expect(first.total).toBe(expectedCount);
  expect(first.ids).toHaveLength(expectedCount); // nothing skipped
  expect(new Set(first.ids).size).toBe(expectedCount); // nothing repeated
  expect(second.ids).toEqual(first.ids); // identical order on every walk

  const tied = first.ids.filter((id) => !outsideTie.includes(id));
  const ascending = [...tied].sort();
  expect(tied).toEqual(direction === "desc" ? ascending.reverse() : ascending); // ties fall back to _id
  return first.ids;
}

describe("paging stays correct when many rows tie on the sort field", () => {
  it("tasks with identical creation times", async () => {
    const manager = await makeUser("manager");
    const project = await Project.create({ title: "P" });
    // inserted straight into the collection so every createdAt really is identical
    await Task.collection.insertMany(
      Array.from({ length: COUNT }, (_, i) => ({
        title: `Task ${i}`,
        project: project._id,
        status: "not_started",
        priority: "medium",
        createdAt: SAME_TIME,
        updatedAt: SAME_TIME,
      }))
    );
    await expectStablePaging(manager, "/api/tasks", COUNT, "desc");
  });

  it("daily reports with identical dates", async () => {
    const manager = await makeUser("manager");
    const member = await makeUser("team_member");
    await DailyReport.insertMany(
      Array.from({ length: COUNT }, (_, i) => ({ user: member._id, workDone: `Work ${i}`, date: SAME_TIME }))
    );
    await expectStablePaging(manager, "/api/reports", COUNT, "desc");
  });

  it("reviews with identical creation times", async () => {
    const manager = await makeUser("manager");
    const member = await makeUser("team_member");
    await Review.collection.insertMany(
      Array.from({ length: COUNT }, (_, i) => ({
        reviewer: manager._id,
        employee: member._id,
        rating: (i % 5) + 1,
        comments: `Review ${i}`,
        createdAt: SAME_TIME,
        updatedAt: SAME_TIME,
      }))
    );
    await expectStablePaging(manager, "/api/reviews", COUNT, "desc");
  });

  it("people who share the same name", async () => {
    const manager = await makeUser("manager");
    for (let i = 0; i < COUNT; i++) await makeUser("team_member", { name: "Alex Same" });
    // +1 for the manager, whose name ("manager 1") differs: it sorts after "Alex Same", so it must come last
    const ids = await expectStablePaging(manager, "/api/users", COUNT + 1, "asc", [manager._id.toString()]);
    expect(ids[ids.length - 1]).toBe(manager._id.toString());
  });
});

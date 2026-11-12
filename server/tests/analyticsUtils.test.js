import { describe, it, expect } from "vitest";
import { summarize, weeklyTrend, startOfWeekUTC, isOverdue, isDueSoon } from "../utils/analytics.js";
import { csvCell, toCsv } from "../utils/csv.js";
import { buildReport, reportToCsv, reportFilename } from "../utils/report.js";

// Pure logic: no database. "now" is fixed (a Wednesday) so the results never depend on the day the tests run.
const now = new Date("2026-11-11T15:00:00Z");
let n = 0;
const task = (over) => ({ _id: `t${++n}`, title: "t", status: "not_started", ...over });

describe("overdue and due-soon rules", () => {
  it("compares whole days: due today is not overdue until tomorrow", () => {
    expect(isOverdue(task({ deadline: "2026-11-10T00:00:00Z" }), now)).toBe(true);
    expect(isOverdue(task({ deadline: "2026-11-10T00:00:00Z", status: "completed" }), now)).toBe(false);
    expect(isOverdue(task({ deadline: "2026-11-11T00:00:00Z" }), now)).toBe(false);
    expect(isOverdue(task({}), now)).toBe(false);
  });

  it("counts today through the next 6 days as due soon (7 days in total)", () => {
    expect(isDueSoon(task({ deadline: "2026-11-11T00:00:00Z" }), now)).toBe(true);
    expect(isDueSoon(task({ deadline: "2026-11-17T00:00:00Z" }), now)).toBe(true);
    expect(isDueSoon(task({ deadline: "2026-11-18T00:00:00Z" }), now)).toBe(false);
    expect(isDueSoon(task({ deadline: "2026-11-12T00:00:00Z", status: "completed" }), now)).toBe(false);
    expect(isDueSoon(task({}), now)).toBe(false);
  });
});

describe("weekly trend", () => {
  it("weeks start on Monday", () => {
    expect(startOfWeekUTC(now).toISOString().slice(0, 10)).toBe("2026-11-09");
    expect(startOfWeekUTC(new Date("2026-11-15T23:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-09"); // a Sunday
  });

  it("gives six weeks, oldest first, counting only completed tasks inside them", () => {
    const trend = weeklyTrend(
      [
        task({ status: "completed", completedAt: "2026-11-10T10:00:00Z" }),
        task({ status: "completed", completedAt: "2026-11-09T00:00:00Z" }), // Monday 00:00 belongs to this week
        task({ status: "completed", completedAt: "2026-11-03T10:00:00Z" }), // last week
        task({ status: "completed", completedAt: "2026-09-01T10:00:00Z" }), // too old: ignored
        task({ status: "completed", updatedAt: "2026-10-20T10:00:00Z" }), // older task without completedAt: uses its last edit
        task({ status: "in_progress", completedAt: "2026-11-10T10:00:00Z" }), // not completed: ignored
      ],
      now
    );
    expect(trend.map((b) => b.weekStart)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(trend.map((b) => b.completed)).toEqual([0, 0, 1, 0, 1, 2]);
  });
});

describe("summarize", () => {
  const amy = { _id: "a", name: "Amy" };
  const bob = { _id: "b", name: "Bob" };
  const tasks = [
    task({ status: "completed", assignedUser: amy }),
    task({ status: "blocked", assignedUser: amy, deadline: "2026-11-01T00:00:00Z", title: "old" }),
    task({ status: "in_progress", assignedUser: bob, deadline: "2026-11-09T00:00:00Z", title: "newer" }),
    task({ status: "not_started" }),
  ];

  it("counts totals, overdue and each person's workload", () => {
    const s = summarize(tasks, { now });
    expect(s).toMatchObject({ total: 4, completionRate: 25, overdue: 2, dueSoon: 0 });
    expect(s.byStatus).toEqual({ not_started: 1, in_progress: 1, completed: 1, blocked: 1 });
    expect(s.byPerson[0]).toEqual({ name: "Amy", total: 2, completed: 1, open: 1, overdue: 1, blocked: 1 });
  });

  it("lists overdue tasks with the most overdue first, and can leave the list out", () => {
    const s = summarize(tasks, { now });
    expect(s.overdueList.map((t) => [t.title, t.daysOverdue])).toEqual([["old", 10], ["newer", 2]]);
    expect(summarize(tasks, { now, withLists: false }).overdueList).toBeUndefined();
  });
});

describe("CSV", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("hello")).toBe("hello");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(null)).toBe("");
  });

  it("stops spreadsheet formulas written by users from running, but leaves real numbers alone", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    for (const text of ["+1", "-1x", "@SUM(A1)"]) expect(csvCell(text).startsWith("'")).toBe(true);
    expect(csvCell(-5)).toBe("-5");
  });

  it("starts with a BOM (so Excel reads accents) and uses Windows line endings", () => {
    const csv = toCsv([["a"], ["b"]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\n");
  });
});

describe("report builder", () => {
  const report = buildReport({
    tasks: [task({ status: "completed", completedAt: "2026-11-10T10:00:00Z", createdAt: "2026-11-01T00:00:00Z", project: { title: "P" }, title: "=cmd" })],
    reports: [{ date: "2026-11-10T00:00:00Z", user: { name: "Amy" }, hours: 2.5, workDone: "did, things", blockers: "" }],
    projectLabel: "P",
    period: "week",
    generatedBy: "Boss",
    now,
  });

  it("works out the period figures", () => {
    expect(report.meta).toMatchObject({ project: "P", from: "2026-11-04", to: "2026-11-11" });
    expect(report.summary).toMatchObject({ completedInPeriod: 1, createdInPeriod: 0, reportsInPeriod: 1, hoursInPeriod: 2.5 });
  });

  it("writes every section to the CSV, with unsafe text neutralised", () => {
    const csv = reportToCsv(report);
    for (const heading of ["SUMMARY", "WORKLOAD", "TASKS", "DAILY REPORTS"]) expect(csv).toContain(heading);
    expect(csv).toContain("'=cmd");
  });

  it("makes a safe file name", () => {
    expect(reportFilename(report.meta)).toBe("nexora-report-p-week-2026-11-11.csv");
    expect(reportFilename({ project: '../..\\"; rm -rf', period: "month", to: "2026-11-11" })).toBe("nexora-report-rm-rf-month-2026-11-11.csv");
  });
});

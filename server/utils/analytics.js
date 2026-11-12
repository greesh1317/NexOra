// The numbers behind the analytics dashboard and the downloadable reports.
// Deliberately plain: loops and counters, no database tricks, so every figure is easy to explain.

export const STATUS_KEYS = ["not_started", "in_progress", "completed", "blocked"];
const DAY = 24 * 60 * 60 * 1000;

// Dates are compared by calendar day (UTC), the same way the screens show them,
// so a task due today is never "overdue" until tomorrow begins.
export const startOfTodayUTC = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

// Weeks start on Monday
export const startOfWeekUTC = (date = new Date()) => {
  const day = startOfTodayUTC(date);
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - daysSinceMonday * DAY);
};

// When was the task finished? Older tasks (finished before this feature) have no `completedAt`,
// so their last-edited time stands in for it.
export const completionTime = (task) => task.completedAt || task.updatedAt || null;

// Overdue = has a deadline, the deadline's day is before today, and the task is not completed
export const isOverdue = (task, now = new Date()) =>
  Boolean(task.deadline) && task.status !== "completed" && new Date(task.deadline) < startOfTodayUTC(now);

// Due soon = not completed, and due today or within the next 7 days
export const isDueSoon = (task, now = new Date()) => {
  if (!task.deadline || task.status === "completed") return false;
  const start = startOfTodayUTC(now);
  const due = new Date(task.deadline);
  return due >= start && due < new Date(start.getTime() + 7 * DAY);
};

// Tasks finished in each of the last `weeks` weeks (oldest first, current week last; empty weeks show 0)
export function weeklyTrend(tasks, now = new Date(), weeks = 6) {
  const thisWeek = startOfWeekUTC(now).getTime();
  const firstWeek = thisWeek - (weeks - 1) * 7 * DAY;
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(firstWeek + i * 7 * DAY).toISOString().slice(0, 10),
    completed: 0,
  }));

  for (const task of tasks) {
    if (task.status !== "completed") continue;
    const finished = completionTime(task);
    if (!finished) continue;
    const ms = new Date(finished).getTime();
    if (ms < firstWeek || ms >= thisWeek + 7 * DAY) continue;
    buckets[Math.floor((ms - firstWeek) / (7 * DAY))].completed += 1;
  }
  return buckets;
}

// Turn a list of tasks into the dashboard numbers.
//   withLists = false leaves out the overdue task list (used for the per-project rows, to keep them small)
export function summarize(tasks, { now = new Date(), withLists = true } = {}) {
  const byStatus = { not_started: 0, in_progress: 0, completed: 0, blocked: 0 };
  const byPerson = {}; // userId -> { name, total, completed, open, overdue, blocked }
  let overdue = 0;
  let dueSoon = 0;

  for (const t of tasks) {
    if (STATUS_KEYS.includes(t.status)) byStatus[t.status] += 1;
    const late = isOverdue(t, now);
    if (late) overdue += 1;
    if (isDueSoon(t, now)) dueSoon += 1;

    if (t.assignedUser) {
      const id = t.assignedUser._id?.toString() || t.assignedUser.toString();
      const name = t.assignedUser.name || "Unknown";
      if (!byPerson[id]) byPerson[id] = { name, total: 0, completed: 0, open: 0, overdue: 0, blocked: 0 };
      const person = byPerson[id];
      person.total += 1;
      if (t.status === "completed") person.completed += 1;
      else person.open += 1;
      if (t.status === "blocked") person.blocked += 1;
      if (late) person.overdue += 1;
    }
  }

  const total = tasks.length;
  const result = {
    total,
    byStatus,
    completionRate: total === 0 ? 0 : Math.round((byStatus.completed / total) * 100),
    overdue,
    dueSoon,
    weeklyTrend: weeklyTrend(tasks, now),
    byPerson: Object.values(byPerson).sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name)),
  };

  if (withLists) {
    const today = startOfTodayUTC(now).getTime();
    result.overdueList = tasks
      .filter((t) => isOverdue(t, now))
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline)) // the most overdue first
      .slice(0, 10)
      .map((t) => ({
        taskId: t._id,
        title: t.title,
        project: t.project?.title || null,
        assignedTo: t.assignedUser?.name || null,
        deadline: new Date(t.deadline).toISOString().slice(0, 10),
        daysOverdue: Math.max(1, Math.ceil((today - new Date(t.deadline).getTime()) / DAY)),
      }));
  }
  return result;
}

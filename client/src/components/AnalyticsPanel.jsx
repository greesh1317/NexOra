import StatCard from "./StatCard.jsx";

// Draws the analytics numbers (from /api/analytics/...). Plain boxes and bars: no chart library needed.
const STATUS_BARS = [
  ["completed", "Completed", "bg-emerald-500"],
  ["in_progress", "In progress", "bg-indigo-500"],
  ["blocked", "Blocked", "bg-amber-500"],
  ["not_started", "Not started", "bg-slate-300"],
];

const weekLabel = (weekStart) =>
  new Date(`${weekStart}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

const card = "bg-white rounded-xl shadow p-5 print:shadow-none print:border print:border-slate-200";
const th = "px-4 py-2 font-medium";

function AnalyticsPanel({ stats, byProject = [] }) {
  if (!stats) return null;

  if (stats.total === 0) {
    return <div className={`${card} text-sm text-slate-400`}>There are no tasks here yet, so there is nothing to analyse.</div>;
  }

  const maxWeek = Math.max(...stats.weeklyTrend.map((w) => w.completed));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total tasks" value={stats.total} accent="slate" />
        <StatCard label="Completion" value={`${stats.completionRate}%`} accent="green" />
        <StatCard label="In progress" value={stats.byStatus.in_progress} accent="indigo" />
        <StatCard label="Blocked" value={stats.byStatus.blocked} accent="amber" />
        <StatCard label="Overdue" value={stats.overdue} accent="amber" />
        <StatCard label="Due in 7 days" value={stats.dueSoon} accent="indigo" />
      </div>

      <div className={card}>
        <h3 className="font-semibold text-slate-800 mb-3">Where the tasks stand</h3>
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
          {STATUS_BARS.map(([key, , color]) =>
            stats.byStatus[key] > 0 ? (
              <div key={key} className={color} style={{ width: `${(stats.byStatus[key] / stats.total) * 100}%` }} />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-slate-600">
          {STATUS_BARS.map(([key, label, color]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
              {label}: {stats.byStatus[key]}
            </span>
          ))}
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold text-slate-800">Tasks completed per week</h3>
        <p className="text-xs text-slate-400 mb-4">The last 6 weeks (weeks start on Monday). The right-hand bar is this week.</p>
        {maxWeek === 0 ? (
          <p className="text-sm text-slate-400">No tasks were completed in the last 6 weeks.</p>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {stats.weeklyTrend.map((w) => (
              <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs font-medium text-slate-600 mb-1">{w.completed}</span>
                <div
                  className="w-full rounded-t bg-indigo-500"
                  style={{ height: `${Math.max(w.completed === 0 ? 0 : 6, (w.completed / maxWeek) * 100)}%` }}
                  title={`${w.completed} completed in the week of ${weekLabel(w.weekStart)}`}
                />
                <span className="text-[11px] text-slate-400 mt-1">{weekLabel(w.weekStart)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats.byPerson.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <h3 className="font-semibold text-slate-800 mb-3">Workload per person</h3>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className={th}>Person</th>
                <th className={th}>Open</th>
                <th className={th}>Overdue</th>
                <th className={th}>Blocked</th>
                <th className={th}>Completed</th>
                <th className={th}>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.byPerson.map((p) => (
                <tr key={p.name} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-2 text-slate-600">{p.open}</td>
                  <td className={`px-4 py-2 ${p.overdue > 0 ? "text-red-600 font-medium" : "text-slate-600"}`}>{p.overdue}</td>
                  <td className="px-4 py-2 text-slate-600">{p.blocked}</td>
                  <td className="px-4 py-2 text-slate-600">{p.completed}</td>
                  <td className="px-4 py-2 text-slate-600">{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.overdueList?.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <h3 className="font-semibold text-slate-800 mb-1">Overdue tasks</h3>
          <p className="text-xs text-slate-400 mb-3">Past their deadline and not completed. The most overdue is first.</p>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className={th}>Task</th>
                <th className={th}>Project</th>
                <th className={th}>Assigned to</th>
                <th className={th}>Was due</th>
                <th className={th}>Days overdue</th>
              </tr>
            </thead>
            <tbody>
              {stats.overdueList.map((t) => (
                <tr key={t.taskId} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{t.title}</td>
                  <td className="px-4 py-2 text-slate-600">{t.project || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{t.assignedTo || "Unassigned"}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">{t.deadline}</td>
                  <td className="px-4 py-2 text-red-600 font-medium">{t.daysOverdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byProject.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <h3 className="font-semibold text-slate-800 mb-3">Project by project</h3>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className={th}>Project</th>
                <th className={th}>Tasks</th>
                <th className={th}>Completion</th>
                <th className={th}>Overdue</th>
                <th className={th}>Blocked</th>
              </tr>
            </thead>
            <tbody>
              {byProject.map((p) => (
                <tr key={p.projectId} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{p.title}</td>
                  <td className="px-4 py-2 text-slate-600">{p.total}</td>
                  <td className="px-4 py-2 text-slate-600">{p.total === 0 ? "—" : `${p.completionRate}%`}</td>
                  <td className={`px-4 py-2 ${p.overdue > 0 ? "text-red-600 font-medium" : "text-slate-600"}`}>{p.overdue}</td>
                  <td className="px-4 py-2 text-slate-600">{p.byStatus.blocked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AnalyticsPanel;

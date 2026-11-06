import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import ProofLink from "../components/ProofLink.jsx";
import TaskEditModal from "../components/TaskEditModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { formatDeadline } from "../utils/dates.js";
import { membersForProject } from "../utils/teamHelpers.js";

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

const statusStyles = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-indigo-50 text-indigo-600",
  completed: "bg-emerald-50 text-emerald-600",
  blocked: "bg-red-50 text-red-600",
};

const day = (value) => (value ? new Date(value).toLocaleDateString() : "");

// Manager only: every task, daily report and review in one place, filterable by project.
function OverviewPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [project, setProject] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [t, r, v, p, tm] = await Promise.all([
        api.get("/tasks", token),
        api.get("/reports", token),
        api.get("/reviews", token),
        api.get("/projects", token),
        api.get("/teams", token),
      ]);
      setTasks(t);
      setReports(r);
      setReviews(v);
      setProjects(p);
      setTeams(tm);
    } catch (err) {
      setError(err.message || "Failed to load the overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const term = search.trim().toLowerCase();
  const matches = (projectId, text) =>
    (!project || (project === "none" ? !projectId : projectId === project)) && (!term || text.toLowerCase().includes(term));

  const shownTasks = useMemo(
    () => tasks.filter((t) => matches(t.project?._id, `${t.title} ${t.assignedUser?.name || ""}`)),
    [tasks, project, term] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const shownReports = useMemo(
    () => reports.filter((r) => matches(r.project?._id, `${r.user?.name || ""} ${r.workDone || ""}`)),
    [reports, project, term] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const shownReviews = useMemo(
    () => reviews.filter((v) => matches(v.project?._id, `${v.employee?.name || ""} ${v.reviewer?.name || ""} ${v.comments || ""}`)),
    [reviews, project, term] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const tabs = [
    ["tasks", `Tasks (${shownTasks.length})`],
    ["reports", `Daily reports (${shownReports.length})`],
    ["reviews", `Reviews (${shownReviews.length})`],
  ];

  const th = "px-4 py-3";
  const empty = (cols) =>
    !loading && (
      <tr>
        <td className="px-4 py-4 text-slate-400" colSpan={cols}>Nothing matches these filters.</td>
      </tr>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold text-slate-800">Overview</h2>
        <p className="text-sm text-slate-500 mb-6">All tasks, daily reports and reviews across every project.</p>

        <div className="flex flex-wrap gap-3 mb-4">
          <select value={project} onChange={(e) => setProject(e.target.value)} className={inputClass}>
            <option value="">All projects</option>
            <option value="none">No project (history)</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.title}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search names, titles, text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} flex-1 min-w-[12rem]`}
          />
        </div>

        <div className="flex gap-2 mb-4 border-b border-slate-200">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-sm px-4 py-2 -mb-px border-b-2 ${
                tab === key ? "border-indigo-600 text-indigo-700 font-medium" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {loading && <p className="text-sm text-slate-400 mb-4">Loading...</p>}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          {tab === "tasks" && (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-left">
                <tr>
                  <th className={th}>Task</th>
                  <th className={th}>Project</th>
                  <th className={th}>Assigned to</th>
                  <th className={th}>Priority</th>
                  <th className={th}>Due</th>
                  <th className={th}>Status</th>
                  <th className={th}>Proof</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {shownTasks.length === 0 && empty(8)}
                {shownTasks.map((t) => (
                  <tr key={t._id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                    <td className="px-4 py-3 text-slate-600">{t.project?.title || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{t.assignedUser?.name || "Unassigned"}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{t.priority}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDeadline(t.deadline)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[t.status]}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ProofLink url={t.submissionLink} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(t)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "reports" && (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-left">
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Person</th>
                  <th className={th}>Project</th>
                  <th className={th}>Work done</th>
                  <th className={th}>Hours</th>
                  <th className={th}>Proof</th>
                </tr>
              </thead>
              <tbody>
                {shownReports.length === 0 && empty(6)}
                {shownReports.map((r) => (
                  <tr key={r._id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{day(r.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.user?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.project?.title || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.workDone}</td>
                    <td className="px-4 py-3 text-slate-600">{r.hours ?? "—"}</td>
                    <td className="px-4 py-3"><ProofLink url={r.submissionLink} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "reviews" && (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-left">
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Team member</th>
                  <th className={th}>Reviewed by</th>
                  <th className={th}>Project</th>
                  <th className={th}>Rating</th>
                  <th className={th}>Comments</th>
                </tr>
              </thead>
              <tbody>
                {shownReviews.length === 0 && empty(6)}
                {shownReviews.map((v) => (
                  <tr key={v._id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{day(v.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{v.employee?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{v.reviewer?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{v.project?.title || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{v.rating} / 5</td>
                    <td className="px-4 py-3 text-slate-600">{v.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {editing && (
        <TaskEditModal
          task={editing}
          candidates={membersForProject(editing.project?._id, projects, teams)}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

export default OverviewPage;

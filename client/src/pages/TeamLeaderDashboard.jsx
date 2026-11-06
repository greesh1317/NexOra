import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import ProofLink from "../components/ProofLink.jsx";
import SummaryBadge from "../components/SummaryBadge.jsx";
import TaskEditModal from "../components/TaskEditModal.jsx";
import { membersForProject, projectHasTeam } from "../utils/teamHelpers.js";
import { AttachmentChips, useAttachments } from "../components/Attachments.jsx";
import { formatDeadline } from "../utils/dates.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const statusStyles = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-indigo-50 text-indigo-600",
  completed: "bg-emerald-50 text-emerald-600",
  blocked: "bg-red-50 text-red-600",
};

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function Stars({ rating }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(rating)}
      <span className="text-slate-200">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function TeamLeaderDashboard() {
  const { token, user } = useAuth();
  const { byTask, byReport, reload: reloadFiles } = useAttachments(token);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [projectStats, setProjectStats] = useState({}); // projectId -> analytics
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ title: "", project: "", assignedUser: "", priority: "medium", deadline: "" });
  const [submitting, setSubmitting] = useState(false);

  const [reviewForm, setReviewForm] = useState({ employee: "", project: "", rating: "5", comments: "" });
  const [reviewing, setReviewing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  const [summaries, setSummaries] = useState({}); // projectId -> { loading, data, error }
  const [summaryScope, setSummaryScope] = useState("today");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [projectData, memberData, taskData, reportData, reviewData, teamData] = await Promise.all([
        api.get("/projects", token),
        api.get("/users?role=team_member", token),
        api.get("/tasks", token),
        api.get("/reports", token),
        api.get("/reviews", token),
        api.get("/teams", token).catch(() => []),
      ]);
      setTeams(teamData);
      setProjects(projectData);
      setMembers(memberData);
      setTasks(taskData);
      setReports(reportData);
      setReviews(reviewData);

      const statsEntries = await Promise.all(
        projectData.map(async (p) => {
          try {
            return [p._id, await api.get(`/analytics/project/${p._id}`, token)];
          } catch {
            return [p._id, null];
          }
        })
      );
      setProjectStats(Object.fromEntries(statsEntries));
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.deadline) delete payload.deadline;
      await api.post("/tasks", payload, token);
      setForm({ title: "", project: "", assignedUser: "", priority: "medium", deadline: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.employee) return;
    setReviewing(true);
    setReviewMessage("");
    try {
      const payload = { ...reviewForm, rating: Number(reviewForm.rating) };
      if (!payload.project) delete payload.project;
      await api.post("/reviews", payload, token);
      setReviewMessage("Review submitted — the team member has been notified.");
      setReviewForm({ employee: "", project: "", rating: "5", comments: "" });
      await loadData();
    } catch (err) {
      setReviewMessage(err.message || "Failed to submit review");
    } finally {
      setReviewing(false);
    }
  };

  const handleSummarize = async (projectId) => {
    setSummaries((prev) => ({ ...prev, [projectId]: { loading: true } }));
    try {
      const data = await api.post("/summary", { project: projectId, scope: summaryScope }, token);
      setSummaries((prev) => ({ ...prev, [projectId]: { data } }));
    } catch (err) {
      setSummaries((prev) => ({ ...prev, [projectId]: { error: err.message || "Failed to generate summary" } }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Your projects</h2>
          <select
            value={summaryScope}
            onChange={(e) => setSummaryScope(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="today">Summaries: today</option>
            <option value="week">Summaries: this week</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {!loading && projects.length === 0 && (
            <p className="text-sm text-slate-400">
              No projects assigned to you yet — ask a manager to assign you as a leader.
            </p>
          )}
          {projects.map((p) => {
            const stats = projectStats[p._id];
            const s = summaries[p._id];
            return (
              <div key={p._id} className="bg-white rounded-xl shadow p-4">
                <p className="font-medium text-slate-800">{p.title}</p>
                <p className="text-xs text-slate-400 mt-1">{p.description || "No description"}</p>

                {stats && stats.total > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{stats.byStatus.completed}/{stats.total} tasks done</span>
                      <span>{stats.completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${stats.completionRate}%` }} />
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleSummarize(p._id)}
                  disabled={s?.loading}
                  className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-60 font-medium"
                >
                  {s?.loading ? "Generating..." : "✨ Summarize progress"}
                </button>

                {s?.error && <p className="text-xs text-red-600 mt-2">{s.error}</p>}
                {s?.data && (
                  <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-700 leading-relaxed">{s.data.summary}</p>
                    <SummaryBadge source={s.data.source} reason={s.data.reason} className="text-[10px] text-slate-400 mt-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Assign a task</h2>
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              required
            />
            <select
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value, assignedUser: "" })}
              className={inputClass}
              required
            >
              <option value="">Choose one of your projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </select>
            <select
              value={form.assignedUser}
              onChange={(e) => setForm({ ...form, assignedUser: e.target.value })}
              disabled={!form.project || !projectHasTeam(form.project, projects)}
              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
            >
              <option value="">
                {!form.project
                  ? "Choose a project first"
                  : !projectHasTeam(form.project, projects)
                  ? "This project has no team yet (ask your Manager)"
                  : "Assign to a team member"}
              </option>
              {membersForProject(form.project, projects, teams).map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Deadline (optional)</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {submitting ? "Assigning..." : "Assign task"}
            </button>
          </form>
          {members.length === 0 && (
            <p className="text-xs text-slate-400 mt-3">
              No team member accounts found yet — ask the Manager to add people from their dashboard.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <h2 className="text-lg font-semibold text-slate-800 mb-4">All tasks</h2>
        <div className="bg-white rounded-xl shadow overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Files</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && tasks.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={7}>No tasks yet — assign one above.</td>
                </tr>
              )}
              {tasks.map((t) => (
                <tr key={t._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                  <td className="px-4 py-3 text-slate-600">{t.assignedUser?.name || "Unassigned"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDeadline(t.deadline)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[t.status]}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3"><ProofLink url={t.submissionLink} /></td>
                  <td className="px-4 py-3 align-top">
                    <AttachmentChips files={byTask[t._id]} token={token} currentUser={user} onChanged={reloadFiles} onError={setError} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingTask(t)} className="text-xs text-indigo-600 hover:underline">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Daily reports</h2>
        <div className="bg-white rounded-xl shadow overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Team member</th>
                <th className="px-4 py-3">Work done</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Files</th>
              </tr>
            </thead>
            <tbody>
              {!loading && reports.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={6}>No daily reports submitted yet.</td>
                </tr>
              )}
              {reports.map((r) => (
                <tr key={r._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.user?.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.workDone}
                    {r.blockers && <span className="block text-xs text-red-500 mt-1">Blocker: {r.blockers}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.hours ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><ProofLink url={r.submissionLink} /></td>
                  <td className="px-4 py-3 align-top">
                    <AttachmentChips files={byReport[r._id]} token={token} currentUser={user} onChanged={reloadFiles} onError={setError} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Leave a review</h2>
          <form onSubmit={handleCreateReview} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select
              value={reviewForm.employee}
              onChange={(e) => setReviewForm({ ...reviewForm, employee: e.target.value })}
              className={inputClass}
              required
            >
              <option value="">Select team member</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
            <select
              value={reviewForm.project}
              onChange={(e) => setReviewForm({ ...reviewForm, project: e.target.value })}
              className={inputClass}
            >
              <option value="">Project (optional)</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </select>
            <select
              value={reviewForm.rating}
              onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
              className={inputClass}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} / 5</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Comments (optional)"
              value={reviewForm.comments}
              onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={reviewing}
              className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors w-fit"
            >
              {reviewing ? "Submitting..." : "Submit review"}
            </button>
          </form>
          {reviewMessage && (
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mt-4">
              {reviewMessage}
            </p>
          )}
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Reviews given</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Team member</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comments</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {!loading && reviews.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={4}>No reviews yet.</td>
                </tr>
              )}
              {reviews.map((r) => (
                <tr key={r._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.employee?.name}</td>
                  <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                  <td className="px-4 py-3 text-slate-600">{r.comments || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          candidates={membersForProject(editingTask.project?._id, projects, teams)}
          token={token}
          onClose={() => setEditingTask(null)}
          onSaved={async () => {
            setEditingTask(null);
            await loadData();
          }}
        />
      )}
    </div>
  );
}

export default TeamLeaderDashboard;

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const statusStyles = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-indigo-50 text-indigo-600",
  completed: "bg-emerald-50 text-emerald-600",
  blocked: "bg-red-50 text-red-600",
};

function TeamLeaderDashboard() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ title: "", project: "", assignedUser: "", priority: "medium" });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [projectData, memberData, taskData, reportData] = await Promise.all([
        api.get("/projects", token),
        api.get("/users?role=team_member", token),
        api.get("/tasks", token),
        api.get("/reports", token),
      ]);
      setProjects(projectData);
      setMembers(memberData);
      setTasks(taskData);
      setReports(reportData);
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
      await api.post("/tasks", form, token);
      setForm({ title: "", project: "", assignedUser: "", priority: "medium" });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Your projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {!loading && projects.length === 0 && (
            <p className="text-sm text-slate-400">
              No projects assigned to you yet — ask a manager to assign you as a leader.
            </p>
          )}
          {projects.map((p) => (
            <div key={p._id} className="bg-white rounded-xl shadow p-4">
              <p className="font-medium text-slate-800">{p.title}</p>
              <p className="text-xs text-slate-400 mt-1">{p.description || "No description"}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Assign a task</h2>
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <select
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Attach to project (optional)</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title}
                </option>
              ))}
            </select>
            <select
              value={form.assignedUser}
              onChange={(e) => setForm({ ...form, assignedUser: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Assign to a team member</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
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
              No team member accounts found yet — run the seed script, or register one, to have
              someone to assign tasks to.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <h2 className="text-lg font-semibold text-slate-800 mb-4">All tasks</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && tasks.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={4}>
                    No tasks yet — assign one above.
                  </td>
                </tr>
              )}
              {tasks.map((t) => (
                <tr key={t._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                  <td className="px-4 py-3 text-slate-600">{t.assignedUser?.name || "Unassigned"}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{t.priority}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[t.status]}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Daily reports</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Team member</th>
                <th className="px-4 py-3">Work done</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {!loading && reports.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={4}>
                    No daily reports submitted yet.
                  </td>
                </tr>
              )}
              {reports.map((r) => (
                <tr key={r._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.user?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.workDone}</td>
                  <td className="px-4 py-3 text-slate-600">{r.hours ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default TeamLeaderDashboard;

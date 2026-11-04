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

const statusOptions = ["not_started", "in_progress", "completed", "blocked"];

function TeamMemberDashboard() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reportForm, setReportForm] = useState({ workDone: "", blockers: "", hours: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [taskData, reportData] = await Promise.all([
        api.get("/tasks", token),
        api.get("/reports", token),
      ]);
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

  const handleStatusChange = async (taskId, status) => {
    setError("");
    try {
      await api.put(`/tasks/${taskId}`, { status }, token);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    } catch (err) {
      setError(err.message || "Failed to update task");
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportForm.workDone) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...reportForm, hours: reportForm.hours ? Number(reportForm.hours) : undefined };
      await api.post("/reports", payload, token);
      setReportForm({ workDone: "", blockers: "", hours: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Your tasks</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && tasks.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={4}>
                    No tasks assigned to you yet.
                  </td>
                </tr>
              )}
              {tasks.map((t) => (
                <tr key={t._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                  <td className="px-4 py-3 text-slate-600">{t.project?.title || "-"}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{t.priority}</td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t._id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${statusStyles[t.status]}`}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Submit a daily report</h2>
          <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
            <textarea
              placeholder="What did you work on today?"
              value={reportForm.workDone}
              onChange={(e) => setReportForm({ ...reportForm, workDone: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              required
            />
            <textarea
              placeholder="Any blockers? (optional)"
              value={reportForm.blockers}
              onChange={(e) => setReportForm({ ...reportForm, blockers: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="Hours worked (optional)"
              value={reportForm.hours}
              onChange={(e) => setReportForm({ ...reportForm, hours: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors w-fit"
            >
              {submitting ? "Submitting..." : "Submit report"}
            </button>
          </form>
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Your recent reports</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Work done</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {!loading && reports.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={3}>
                    You haven't submitted any reports yet.
                  </td>
                </tr>
              )}
              {reports.map((r) => (
                <tr key={r._id} className="border-t border-slate-100">
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

export default TeamMemberDashboard;

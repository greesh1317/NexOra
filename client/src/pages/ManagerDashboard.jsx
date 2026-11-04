import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const statusStyles = {
  upcoming: "bg-amber-50 text-amber-600",
  ongoing: "bg-indigo-50 text-indigo-600",
  completed: "bg-emerald-50 text-emerald-600",
};

function ManagerDashboard() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ title: "", description: "", leader: "", status: "upcoming" });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [projectData, leaderData] = await Promise.all([
        api.get("/projects", token),
        api.get("/users?role=team_leader", token),
      ]);
      setProjects(projectData);
      setLeaders(leaderData);
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

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/projects", form, token);
      setForm({ title: "", description: "", leader: "", status: "upcoming" });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const ongoing = projects.filter((p) => p.status === "ongoing").length;
  const upcoming = projects.filter((p) => p.status === "upcoming").length;
  const completed = projects.filter((p) => p.status === "completed").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Overview</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Ongoing" value={ongoing} accent="indigo" />
          <StatCard label="Upcoming" value={upcoming} accent="amber" />
          <StatCard label="Completed" value={completed} accent="green" />
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Create a project</h2>
          <form onSubmit={handleCreateProject} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Project title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <select
              value={form.leader}
              onChange={(e) => setForm({ ...form, leader: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Assign a team leader (optional)</option>
              {leaders.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {submitting ? "Creating..." : "Create project"}
            </button>
          </form>
          {leaders.length === 0 && (
            <p className="text-xs text-slate-400 mt-3">
              No team leader accounts found yet — run the seed script, or register one, to assign
              a leader when creating a project.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Projects</h2>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Leader</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={3}>
                    Loading projects...
                  </td>
                </tr>
              )}
              {!loading && projects.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={3}>
                    No projects yet — create one above.
                  </td>
                </tr>
              )}
              {projects.map((p) => (
                <tr key={p._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.title}</td>
                  <td className="px-4 py-3 text-slate-600">{p.leader?.name || "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[p.status]}`}>
                      {p.status}
                    </span>
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

export default ManagerDashboard;

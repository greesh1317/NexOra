import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import StatCard from "../components/StatCard.jsx";
import SummaryBadge from "../components/SummaryBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { formatDeadline } from "../utils/dates.js";

const statusStyles = {
  upcoming: "bg-amber-50 text-amber-600",
  ongoing: "bg-indigo-50 text-indigo-600",
  completed: "bg-emerald-50 text-emerald-600",
};

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function ManagerDashboard() {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const emptyProject = { title: "", description: "", leader: "", status: "upcoming", startDate: "", endDate: "" };
  const [form, setForm] = useState(emptyProject);
  const [submitting, setSubmitting] = useState(false);

  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "team_member" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userMessage, setUserMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [analytics, setAnalytics] = useState(null);

  const [summaryScope, setSummaryScope] = useState("today");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [projectData, leaderData, memberData, analyticsData] = await Promise.all([
        api.get("/projects", token),
        api.get("/users?role=team_leader", token),
        api.get("/users?role=team_member", token),
        api.get("/analytics/overview", token).catch(() => null),
      ]);
      setProjects(projectData);
      setLeaders(leaderData);
      setMembers(memberData);
      setAnalytics(analyticsData);
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
      // Send only the fields that were filled in (an empty leader/date would fail validation)
      const payload = { ...form };
      ["leader", "startDate", "endDate"].forEach((k) => !payload[k] && delete payload[k]);
      await api.post("/projects", payload, token);
      setForm(emptyProject);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.password) return;
    setCreatingUser(true);
    setUserMessage("");
    try {
      const created = await api.post("/users", userForm, token);
      setUserMessage(`Created ${created.name} (${created.role.replace("_", " ")}) — they can log in now.`);
      setUserForm({ name: "", email: "", password: "", role: "team_member" });
      await loadData();
    } catch (err) {
      setUserMessage(err.message || "Failed to create account");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      setSearchResults(await api.get(`/users?search=${encodeURIComponent(searchTerm)}`, token));
    } catch (err) {
      setError(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    setSummary(null);
    try {
      setSummary(await api.post("/summary", { scope: summaryScope }, token));
    } catch (err) {
      setSummaryError(err.message || "Failed to generate summary");
    } finally {
      setSummaryLoading(false);
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

        {analytics && analytics.overall.total > 0 && (
          <div className="bg-white rounded-xl shadow p-5 mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Task analytics</h2>
            <p className="text-xs text-slate-400 mb-4">
              Across all projects — {analytics.overall.total} total tasks, {analytics.overall.completionRate}% complete
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="Not started" value={analytics.overall.byStatus.not_started} accent="slate" />
              <StatCard label="In progress" value={analytics.overall.byStatus.in_progress} accent="indigo" />
              <StatCard label="Completed" value={analytics.overall.byStatus.completed} accent="green" />
              <StatCard label="Blocked" value={analytics.overall.byStatus.blocked} accent="amber" />
            </div>
            {analytics.overall.byPerson.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Top contributors</p>
                <ul className="text-sm text-slate-700 space-y-1">
                  {analytics.overall.byPerson.slice(0, 5).map((p) => (
                    <li key={p.name} className="flex justify-between">
                      <span>{p.name}</span>
                      <span className="text-slate-400">{p.completed}/{p.total} tasks</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-slate-800">AI progress summary</h2>
            <select
              value={summaryScope}
              onChange={(e) => setSummaryScope(e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="today">Today</option>
              <option value="week">This week</option>
            </select>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Generates a plain-English progress summary from tasks and daily reports across the org.
          </p>
          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {summaryLoading ? "Generating..." : "Generate summary"}
          </button>

          {summaryError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
              {summaryError}
            </p>
          )}

          {summary && (
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
              <p className="text-sm text-slate-700 leading-relaxed">{summary.summary}</p>
              <SummaryBadge source={summary.source} reason={summary.reason} className="text-[11px] text-slate-400 mt-2" />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Find a person</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {searching ? "..." : "Search"}
            </button>
          </form>
          {searchResults && (
            <ul className="mt-4 text-sm text-slate-700 space-y-1">
              {searchResults.length === 0 && <li className="text-slate-400">No matches found.</li>}
              {searchResults.map((u) => (
                <li key={u._id} className="flex justify-between border-b border-slate-50 py-1.5 last:border-0">
                  <span>{u.name} · <span className="text-slate-400">{u.email}</span></span>
                  <span className="text-xs text-slate-400 capitalize">{u.role.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Add a person</h2>
          <p className="text-xs text-slate-400 mb-4">
            There's no public sign-up — as the Manager, you create Team Leader and Team Member
            accounts here. Share the email/password you set with them directly.
          </p>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full name"
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              className={inputClass}
              required
            />
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              className={inputClass}
            >
              <option value="team_member">Team Member</option>
              <option value="team_leader">Team Leader</option>
            </select>
            <input
              type="email"
              placeholder="Email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className={inputClass}
              required
            />
            <input
              type="text"
              placeholder="Temporary password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className={inputClass}
              required
            />
            <button
              type="submit"
              disabled={creatingUser}
              className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors w-fit"
            >
              {creatingUser ? "Creating..." : "Create account"}
            </button>
          </form>
          {userMessage && (
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mt-4">
              {userMessage}
            </p>
          )}

          {(leaders.length > 0 || members.length > 0) && (
            <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Team Leaders</p>
                <ul className="text-sm text-slate-700 space-y-1">
                  {leaders.map((l) => (
                    <li key={l._id}>{l.name} · <span className="text-slate-400">{l.email}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Team Members</p>
                <ul className="text-sm text-slate-700 space-y-1">
                  {members.map((m) => (
                    <li key={m._id}>{m.name} · <span className="text-slate-400">{m.email}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Create a project</h2>
          <form onSubmit={handleCreateProject} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Project title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputClass}
              required
            />
            <select
              value={form.leader}
              onChange={(e) => setForm({ ...form, leader: e.target.value })}
              className={inputClass}
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
              className={`sm:col-span-2 ${inputClass}`}
            />
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start date (optional)</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={`w-full ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Due date (optional) — shows on the calendar</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={`w-full ${inputClass}`}
              />
            </div>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
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
              No team leader accounts found yet — use "Add a person" above, or run the seed script.
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
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={4}>Loading projects...</td>
                </tr>
              )}
              {!loading && projects.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={4}>No projects yet — create one above.</td>
                </tr>
              )}
              {projects.map((p) => (
                <tr key={p._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.title}</td>
                  <td className="px-4 py-3 text-slate-600">{p.leader?.name || "Unassigned"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDeadline(p.endDate)}</td>
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

import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import AnalyticsPanel from "../components/AnalyticsPanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

// e.g. nexora-report-website-redesign-week-2026-11-11.csv (the same pattern the server uses)
const csvFileName = (title, period) => {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "report";
  return `nexora-report-${slug}-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
};

// Managers and Team Leaders: the numbers behind a project, and a downloadable weekly / monthly report.
function AnalyticsPage() {
  const { token, user } = useAuth();
  const isManager = user?.role === "manager";

  const [projects, setProjects] = useState([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectId, setProjectId] = useState(""); // "" = every project (Managers only)
  const [stats, setStats] = useState(null);
  const [byProject, setByProject] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("week");
  const [downloading, setDownloading] = useState(false);
  const requestId = useRef(0);

  // Which projects can be chosen? (a Manager: all, a Team Leader: the ones they lead)
  useEffect(() => {
    api
      .get("/projects", token)
      .then((list) => {
        setProjects(list);
        if (!isManager && list.length > 0) setProjectId(list[0]._id);
      })
      .catch((err) => setError(err.message || "Failed to load projects"))
      .finally(() => setProjectsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The numbers for the chosen project (or the whole organisation, for a Manager)
  useEffect(() => {
    if (!projectsLoaded) return;
    if (!isManager && !projectId) {
      setStats(null);
      return;
    }
    const myId = ++requestId.current;
    setLoading(true);
    setError("");
    const request = projectId ? api.get(`/analytics/project/${projectId}`, token) : api.get("/analytics/overview", token);
    request
      .then((res) => {
        if (myId !== requestId.current) return; // a newer choice replaced this one
        setStats(projectId ? res : res.overall);
        setByProject(projectId ? [] : res.byProject);
      })
      .catch((err) => myId === requestId.current && setError(err.message || "Failed to load analytics"))
      .finally(() => myId === requestId.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, projectsLoaded]);

  const projectTitle = projects.find((p) => p._id === projectId)?.title || (isManager ? "All projects" : "");

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const query = new URLSearchParams({ period });
      if (projectId) query.set("project", projectId);
      await api.download(`/analytics/report.csv?${query.toString()}`, token, csvFileName(projectTitle || "report", period));
    } catch (err) {
      setError(err.message || "Could not download the report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* shown only when printing / saving as PDF */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-semibold">NexOra analytics: {projectTitle}</h1>
          <p className="text-sm text-slate-500">Printed on {new Date().toLocaleDateString()}</p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 print:hidden">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Analytics</h2>
            <p className="text-sm text-slate-500">Progress, overdue work and workload, with a downloadable report.</p>
          </div>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
            {isManager && <option value="">All projects</option>}
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 print:hidden">{error}</p>
        )}

        {projectsLoaded && !isManager && projects.length === 0 && (
          <div className="bg-white rounded-xl shadow p-6 text-sm text-slate-400">You don't lead any projects yet.</div>
        )}

        {loading && <p className="text-sm text-slate-400 mb-4">Loading analytics...</p>}

        {!loading && <AnalyticsPanel stats={stats} byProject={byProject} />}

        {stats && (
          <div className="bg-white rounded-xl shadow p-5 mt-6 print:hidden">
            <h3 className="font-semibold text-slate-800">Download a report</h3>
            <p className="text-xs text-slate-400 mb-4">
              A spreadsheet (CSV) for {projectTitle || "your projects"} with the summary, each person's workload, every task, and the daily
              reports from the chosen period. It opens in Excel.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass}>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm"
              >
                {downloading ? "Preparing..." : "Download CSV"}
              </button>
              <button
                onClick={() => window.print()}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-2 text-sm"
              >
                Print / Save as PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AnalyticsPage;

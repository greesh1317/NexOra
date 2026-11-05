import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import ProofLink from "../components/ProofLink.jsx";
import { AttachButton, AttachmentChips, ACCEPT, MAX_FILE_BYTES, uploadFile, useAttachments } from "../components/Attachments.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { buildCommitsLink } from "../utils/github.js";
import { dateKey, daysBetweenKeys, formatDeadline, todayKey } from "../utils/dates.js";

const statusStyles = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-indigo-50 text-indigo-600",
  completed: "bg-emerald-50 text-emerald-600",
  blocked: "bg-red-50 text-red-600",
};

const statusOptions = ["not_started", "in_progress", "completed", "blocked"];
const GITHUB_PREFS_KEY = "nexora_github_prefs";
const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function loadGithubPrefs() {
  try {
    return JSON.parse(localStorage.getItem(GITHUB_PREFS_KEY)) || { repo: "", username: "" };
  } catch {
    return { repo: "", username: "" };
  }
}

function TeamMemberDashboard() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { byTask, byReport, reload: reloadFiles } = useAttachments(token);

  const emptyReport = { project: "", workDone: "", blockers: "", hours: "", submissionLink: "" };
  const [reportForm, setReportForm] = useState(emptyReport);
  const [reportFile, setReportFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0); // bump to clear the file input
  const [submitting, setSubmitting] = useState(false);

  const [githubPrefs, setGithubPrefs] = useState(loadGithubPrefs);
  const [linkDrafts, setLinkDrafts] = useState({}); // taskId -> draft link text
  const [savingLinkFor, setSavingLinkFor] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [taskData, reportData, reviewData, projectData] = await Promise.all([
        api.get("/tasks", token),
        api.get("/reports", token),
        api.get("/reviews", token),
        api.get("/projects", token).catch(() => []), // a failure here must not break the dashboard
      ]);
      setTasks(taskData);
      setProjects(projectData);
      setReports(reportData);
      setReviews(reviewData);
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

  // The projects this member can report on: their team's projects plus any project they have a task in
  const myProjects = useMemo(() => {
    const seen = new Map();
    projects.forEach((p) => seen.set(p._id, p));
    tasks.forEach((t) => t.project && seen.set(t.project._id, t.project));
    return [...seen.values()];
  }, [projects, tasks]);

  const handleStatusChange = async (taskId, status) => {
    setError("");
    try {
      await api.put(`/tasks/${taskId}`, { status }, token);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    } catch (err) {
      setError(err.message || "Failed to update task");
    }
  };

  const handleSaveTaskLink = async (task) => {
    const draft = (linkDrafts[task._id] ?? task.submissionLink ?? "").trim();
    setSavingLinkFor(task._id);
    setError("");
    try {
      await api.put(`/tasks/${task._id}`, { status: task.status, submissionLink: draft }, token);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, submissionLink: draft } : t)));
      setLinkDrafts((prev) => {
        const next = { ...prev };
        delete next[task._id];
        return next;
      });
    } catch (err) {
      setError(err.message || "Failed to save link");
    } finally {
      setSavingLinkFor(null);
    }
  };

  const handleFillGithubLink = () => {
    const link = buildCommitsLink(githubPrefs);
    if (!link) {
      setError("Enter your GitHub username and the repo (owner/name) first.");
      return;
    }
    setError("");
    localStorage.setItem(GITHUB_PREFS_KEY, JSON.stringify(githubPrefs));
    setReportForm((prev) => ({ ...prev, submissionLink: link }));
  };

  const handlePickReportFile = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > MAX_FILE_BYTES) {
      setError("File is too large (max 5 MB)");
      setFileInputKey((k) => k + 1);
      setReportFile(null);
      return;
    }
    setError("");
    setReportFile(file);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportForm.workDone) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = { ...reportForm, hours: reportForm.hours ? Number(reportForm.hours) : undefined };
      if (!payload.submissionLink) delete payload.submissionLink;
      if (!payload.project) delete payload.project;
      const created = await api.post("/reports", payload, token);

      // The report is saved first; the file (if any) is attached to it afterwards
      let fileProblem = "";
      if (reportFile) {
        try {
          await uploadFile(token, { report: created._id }, reportFile);
        } catch (err) {
          fileProblem = err.message;
        }
      }

      setReportForm(emptyReport);
      setReportFile(null);
      setFileInputKey((k) => k + 1);
      await Promise.all([loadData(), reloadFiles()]);
      if (fileProblem) setError(`Report saved, but the file couldn't be attached: ${fileProblem}`);
    } catch (err) {
      setError(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  // Deadline reminders: unfinished tasks that are overdue or due within 3 days
  const today = todayKey();
  const upcoming = tasks
    .filter((t) => t.deadline && t.status !== "completed")
    .map((t) => ({ ...t, days: daysBetweenKeys(today, dateKey(t.deadline)) }))
    .filter((t) => t.days <= 3)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {upcoming.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm font-medium text-amber-700 mb-1">Deadline reminders</p>
            <ul className="text-sm text-amber-700 space-y-0.5">
              {upcoming.map((t) => (
                <li key={t._id}>
                  “{t.title}” —{" "}
                  {t.days < 0 ? `overdue by ${Math.abs(t.days)} day(s)` : t.days === 0 ? "due today" : `due in ${t.days} day(s)`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Your tasks</h2>
        <div className="bg-white rounded-xl shadow overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Proof link</th>
                <th className="px-4 py-3">Files</th>
              </tr>
            </thead>
            <tbody>
              {!loading && tasks.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={6}>No tasks assigned to you yet.</td>
                </tr>
              )}
              {tasks.map((t) => {
                const draft = linkDrafts[t._id];
                const dirty = draft !== undefined && draft.trim() !== (t.submissionLink || "");
                return (
                  <tr key={t._id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.title}</td>
                    <td className="px-4 py-3 text-slate-600">{t.project?.title || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDeadline(t.deadline)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t._id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${statusStyles[t.status]}`}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 min-w-[190px]">
                      <div className="flex gap-1.5">
                        <input
                          type="url"
                          placeholder="Paste a link (GitHub, Drive...)"
                          value={draft ?? t.submissionLink ?? ""}
                          onChange={(e) => setLinkDrafts((prev) => ({ ...prev, [t._id]: e.target.value }))}
                          className="flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {dirty && (
                          <button
                            onClick={() => handleSaveTaskLink(t)}
                            disabled={savingLinkFor === t._id}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-2.5 py-1"
                          >
                            {savingLinkFor === t._id ? "..." : "Save"}
                          </button>
                        )}
                      </div>
                      {t.submissionLink && !dirty && (
                        <div className="mt-1"><ProofLink url={t.submissionLink} /></div>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[170px]">
                      <AttachmentChips files={byTask[t._id]} token={token} currentUser={user} onChanged={reloadFiles} onError={setError} />
                      <div className="mt-1">
                        <AttachButton token={token} target={{ task: t._id }} onUploaded={reloadFiles} onError={setError} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow p-5 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Submit a daily report</h2>
          <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
            <div>
              <select
                value={reportForm.project}
                onChange={(e) => setReportForm({ ...reportForm, project: e.target.value })}
                className={`${inputClass} w-full sm:w-72`}
                required={myProjects.length > 0}
              >
                <option value="">{myProjects.length > 0 ? "Which project is this for?" : "No project yet"}</option>
                {myProjects.map((p) => (
                  <option key={p._id} value={p._id}>{p.title}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Your Team Leader sees this report through the project you pick.</p>
            </div>
            <textarea
              placeholder="What did you work on today?"
              value={reportForm.workDone}
              onChange={(e) => setReportForm({ ...reportForm, workDone: e.target.value })}
              className={inputClass}
              rows={3}
              required
            />
            <textarea
              placeholder="Any blockers? (optional)"
              value={reportForm.blockers}
              onChange={(e) => setReportForm({ ...reportForm, blockers: e.target.value })}
              className={inputClass}
              rows={2}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="Hours worked (optional)"
              value={reportForm.hours}
              onChange={(e) => setReportForm({ ...reportForm, hours: e.target.value })}
              className={`${inputClass} w-52`}
            />

            <div className="border border-slate-100 bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Proof of work (optional) — paste any link, or generate today's GitHub commits link:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="GitHub username"
                  value={githubPrefs.username}
                  onChange={(e) => setGithubPrefs({ ...githubPrefs, username: e.target.value })}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Repo (owner/name)"
                  value={githubPrefs.repo}
                  onChange={(e) => setGithubPrefs({ ...githubPrefs, repo: e.target.value })}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleFillGithubLink}
                  className="text-xs bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-3 py-1.5"
                >
                  Fill today's commits link
                </button>
              </div>
              <input
                type="url"
                placeholder="https://..."
                value={reportForm.submissionLink}
                onChange={(e) => setReportForm({ ...reportForm, submissionLink: e.target.value })}
                className={`w-full ${inputClass}`}
              />
              <p className="text-xs font-medium text-slate-500 mt-3 mb-1">…or upload a file (PDF, image, Office file, zip — max 5 MB):</p>
              <input
                key={fileInputKey}
                type="file"
                accept={ACCEPT}
                onChange={handlePickReportFile}
                aria-label="Attach a file to this report"
                className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-300"
              />
            </div>

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
        <div className="bg-white rounded-xl shadow overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Work done</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Files</th>
              </tr>
            </thead>
            <tbody>
              {!loading && reports.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={6}>You haven't submitted any reports yet.</td>
                </tr>
              )}
              {reports.map((r) => (
                <tr key={r._id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 text-slate-600">{r.workDone}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.project?.title || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.hours ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><ProofLink url={r.submissionLink} /></td>
                  <td className="px-4 py-3">
                    <AttachmentChips files={byReport[r._id]} token={token} currentUser={user} onChanged={reloadFiles} onError={setError} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Feedback you've received</h2>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Comments</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {!loading && reviews.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={4}>No feedback yet.</td>
                </tr>
              )}
              {reviews.map((r) => (
                <tr key={r._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.reviewer?.name}</td>
                  <td className="px-4 py-3 text-amber-500">
                    {"★".repeat(r.rating)}
                    <span className="text-slate-200">{"★".repeat(5 - r.rating)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.comments || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
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

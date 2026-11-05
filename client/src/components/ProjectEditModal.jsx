import { useState } from "react";
import { api } from "../api/client.js";

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

// Pop-up for a Manager to edit a project: details, dates, status and which team works on it.
function ProjectEditModal({ project, teams, leaders, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: project.title || "",
    description: project.description || "",
    status: project.status || "upcoming",
    startDate: toDateInput(project.startDate),
    endDate: toDateInput(project.endDate),
    team: project.team?._id || "",
    leader: project.leader?._id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const chosenTeam = teams.find((t) => t._id === form.team);
  // With a team chosen, the team's leader leads the project automatically
  const leaderFromTeam = Boolean(chosenTeam?.leader);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        team: form.team || "",
      };
      if (!leaderFromTeam && form.leader) payload.leader = form.leader;
      await api.put(`/projects/${project._id}`, payload, token);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save the project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-800">Edit project</h3>

        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
          placeholder="Project title"
          required
        />
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClass}
          placeholder="Description (optional)"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Start date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Due date</label>
            <input
              type="date"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Team working on this project</label>
          <select value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} className={inputClass}>
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.teamName}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Tasks can only be given to members of this team.</p>
        </div>

        {leaderFromTeam ? (
          <p className="text-sm text-slate-600">
            Project leader: <span className="font-medium">{chosenTeam.leader.name}</span>{" "}
            <span className="text-xs text-slate-400">(from the team)</span>
          </p>
        ) : (
          <select value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })} className={inputClass}>
            <option value="">Project leader (optional)</option>
            {leaders.map((l) => (
              <option key={l._id} value={l._id}>
                {l.name}
              </option>
            ))}
          </select>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800 px-3">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectEditModal;

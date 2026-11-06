import { useState } from "react";
import { api } from "../api/client.js";
import { dateKey } from "../utils/dates.js";

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

// Pop-up to edit, reassign or delete a task (Manager, or the Team Leader of the task's project).
// `candidates` = the people who may be given this task (members of the project's team).
function TaskEditModal({ task, candidates, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: task.title || "",
    assignedUser: task.assignedUser?._id || "",
    deadline: task.deadline ? dateKey(task.deadline) : "",
    priority: task.priority || "medium",
    status: task.status || "not_started",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Keep the current assignee selectable even if they have since left the team
  const options = [...candidates];
  if (task.assignedUser && !options.some((c) => c._id === task.assignedUser._id)) {
    options.unshift({ _id: task.assignedUser._id, name: `${task.assignedUser.name} (deactivated or no longer in the team)` });
  }

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put(
        `/tasks/${task._id}`,
        {
          title: form.title,
          assignedUser: form.assignedUser, // "" means: unassign
          deadline: form.deadline || null,
          priority: form.priority,
          status: form.status,
        },
        token
      );
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save the task");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the task "${task.title}"? Files attached to it will be deleted too.`)) return;
    setSaving(true);
    setError("");
    try {
      await api.del(`/tasks/${task._id}`, token);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not delete the task");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-800">Edit task</h3>
        <p className="text-xs text-slate-400 -mt-2">Project: {task.project?.title || "None"}</p>

        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className={inputClass}
          placeholder="Task title"
          required
        />

        <div>
          <label className="block text-xs text-slate-500 mb-1">Assigned to</label>
          <select value={form.assignedUser} onChange={(e) => setForm({ ...form, assignedUser: e.target.value })} className={inputClass}>
            <option value="">Unassigned</option>
            {options.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">This project's team has no members yet (or the project has no team).</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center justify-between">
          <button type="button" onClick={remove} disabled={saving} className="text-sm text-red-500 hover:underline disabled:opacity-60">
            Delete task
          </button>
          <div className="flex gap-3">
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
        </div>
      </form>
    </div>
  );
}

export default TaskEditModal;

import { useState } from "react";
import { api } from "../api/client.js";

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

// A random 12-character password (no look-alike characters like 0/O or 1/l)
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// Manager sets a new password for someone who forgot theirs
function ResetPasswordModal({ person, token, onClose }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put(`/users/${person._id}/password`, { newPassword: password }, token);
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not reset the password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Reset password for {person.name}</h3>

        {done ? (
          <>
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              Password reset. Give {person.name} this new password now — it will not be shown again:
            </p>
            <p className="font-mono text-sm bg-slate-100 rounded-lg px-3 py-2 select-all">{password}</p>
            <p className="text-xs text-slate-400">Their old sessions have been ended, and they were asked to change it after logging in.</p>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm">
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (at least 8 characters)"
                className={inputClass}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="text-sm text-indigo-600 hover:underline whitespace-nowrap"
              >
                Generate
              </button>
            </div>
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
                {saving ? "Saving..." : "Reset password"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

export default ResetPasswordModal;

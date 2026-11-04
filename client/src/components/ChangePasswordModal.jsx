import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function ChangePasswordModal({ onClose }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.newPassword.length < 8) return setError("New password must be at least 8 characters");
    if (form.newPassword !== form.confirm) return setError("The two new passwords don't match");
    setSaving(true);
    try {
      await api.put(
        "/users/me/password",
        { currentPassword: form.currentPassword, newPassword: form.newPassword },
        token
      );
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not change the password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 px-4" role="dialog" aria-label="Change password">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Change password</h2>

        {done ? (
          <>
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 my-4">
              Password updated. Use the new one next time you log in.
            </p>
            <button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm">
              Close
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-3">
            <input type="password" placeholder="Current password" autoComplete="current-password" className={inputClass}
              value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} required />
            <input type="password" placeholder="New password (min 8 characters)" autoComplete="new-password" className={inputClass}
              value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} required />
            <input type="password" placeholder="Confirm new password" autoComplete="new-password" className={inputClass}
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 mt-1">
              <button type="submit" disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm">
                {saving ? "Saving..." : "Update password"}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 px-3">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChangePasswordModal;

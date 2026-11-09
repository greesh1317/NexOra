import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import ResetPasswordModal from "../components/ResetPasswordModal.jsx";
import Pagination from "../components/Pagination.jsx";
import { useDebounced } from "../utils/useDebounced.js";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

const roleLabels = { manager: "Manager", team_leader: "Team Leader", team_member: "Team Member" };

// Manager only: everyone in one table, with deactivate/reactivate and password reset.
const LIMIT = 20;

function PeoplePage() {
  const { token } = useAuth();
  const [people, setPeople] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [resetting, setResetting] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);

  // Teams are only needed to show which team each person is in — once
  useEffect(() => {
    api.get("/teams", token).then(setTeams).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new filter always starts again from page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  // One page of people, filtered by the server
  useEffect(() => {
    const myId = ++requestId.current;
    setLoading(true);
    setError("");
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());
    if (role) q.set("role", role);
    if (status) q.set("status", status);

    api
      .get(`/users?${q.toString()}`, token)
      .then((res) => {
        if (myId !== requestId.current) return;
        if (res.items.length === 0 && res.total > 0 && page > res.pages) {
          setPage(res.pages);
          return;
        }
        setPeople(res.items);
        setTotal(res.total);
        setPageCount(res.pages);
      })
      .catch((err) => myId === requestId.current && setError(err.message || "Failed to load people"))
      .finally(() => myId === requestId.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, role, status, reloadKey]);

  const teamOf = (person) => {
    const team = teams.find(
      (t) => t.leader?._id === person._id || t.members.some((m) => m._id === person._id)
    );
    return team?.teamName || "";
  };

  const visible = people;

  const toggleActive = async (person) => {
    const deactivating = person.isActive !== false;
    if (
      deactivating &&
      !window.confirm(`Deactivate ${person.name}? They will no longer be able to log in or receive tasks. Their history is kept.`)
    ) {
      return;
    }
    setError("");
    try {
      await api.put(`/users/${person._id}/status`, { isActive: !deactivating }, token);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message || "Failed to update the account");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold text-slate-800">People</h2>
        <p className="text-sm text-slate-500 mb-6">Everyone with an account. Add new people from the Manager dashboard.</p>

        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} flex-1 min-w-[12rem]`}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
            <option value="">All roles</option>
            <option value="team_leader">Team Leaders</option>
            <option value="team_member">Team Members</option>
            <option value="manager">Managers</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="">Active and deactivated</option>
            <option value="active">Active only</option>
            <option value="inactive">Deactivated only</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={5}>Loading people...</td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={5}>No one matches these filters.</td>
                </tr>
              )}
              {visible.map((p) => (
                <tr key={p._id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{roleLabels[p.role]}</td>
                  <td className="px-4 py-3 text-slate-600">{teamOf(p) || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    {p.isActive === false ? (
                      <span className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-1">Deactivated</span>
                    ) : (
                      <span className="text-xs bg-emerald-50 text-emerald-600 rounded-full px-2 py-1">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {p.role !== "manager" && (
                      <>
                        <button onClick={() => setResetting(p)} className="text-xs text-indigo-600 hover:underline">
                          Reset password
                        </button>
                        <button onClick={() => toggleActive(p)} className="text-xs text-indigo-600 hover:underline ml-3">
                          {p.isActive === false ? "Reactivate" : "Deactivate"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pages={pageCount} total={total} limit={LIMIT} onPage={setPage} />
        </div>
      </main>
      {resetting && <ResetPasswordModal person={resetting} token={token} onClose={() => setResetting(null)} />}
    </div>
  );
}

export default PeoplePage;

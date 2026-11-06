import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

const inputClass =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

// Create / edit form (Manager only). People already used by another team are shown but disabled,
// because a member can be in only one team and a leader can lead only one team.
function TeamForm({ team, teams, people, token, onSaved, onCancel }) {
  const isNew = !team._id;
  const [name, setName] = useState(team.teamName || "");
  const [leader, setLeader] = useState(team.leader?._id || "");
  const [members, setMembers] = useState((team.members || []).map((m) => m._id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const others = teams.filter((t) => t._id !== team._id);
  const leaderTeam = new Map(others.filter((t) => t.leader).map((t) => [t.leader._id, t.teamName]));
  const memberTeam = new Map();
  others.forEach((t) => t.members.forEach((m) => memberTeam.set(m._id, t.teamName)));

  // Deactivated people are not offered, unless they already belong to this team (so they can be removed)
  const stillOffered = (p, current) => p.isActive !== false || current;
  const leaders = people.filter((p) => p.role === "team_leader" && stillOffered(p, p._id === leader));
  const candidates = people.filter((p) => p.role === "team_member" && stillOffered(p, members.includes(p._id)));

  const toggle = (id) => setMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { teamName: name, leader: leader || null, members };
      if (isNew) await api.post("/teams", payload, token);
      else await api.put(`/teams/${team._id}`, payload, token);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save the team");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow p-5 mb-8 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">{isNew ? "Create a team" : `Edit "${team.teamName}"`}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          required
        />
        <select value={leader} onChange={(e) => setLeader(e.target.value)} className={inputClass}>
          <option value="">No team leader yet</option>
          {leaders.map((l) => (
            <option key={l._id} value={l._id} disabled={leaderTeam.has(l._id)}>
              {l.name}
              {leaderTeam.has(l._id) ? ` (leads ${leaderTeam.get(l._id)})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Members ({members.length} selected)</p>
        {candidates.length === 0 ? (
          <p className="text-xs text-slate-400">No Team Member accounts yet. Add people on the Manager dashboard.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {candidates.map((m) => {
              const taken = memberTeam.get(m._id);
              return (
                <label
                  key={m._id}
                  className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 ${
                    taken ? "bg-slate-50 text-slate-400 border-slate-100" : "border-slate-200 cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={members.includes(m._id)}
                    disabled={Boolean(taken)}
                    onChange={() => toggle(m._id)}
                  />
                  <span>
                    {m.name}
                    {taken && <span className="text-xs"> (in {taken})</span>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg px-4 py-2 text-sm"
        >
          {saving ? "Saving..." : isNew ? "Create team" : "Save changes"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-800 px-3">
          Cancel
        </button>
      </div>
    </form>
  );
}

function TeamsPage() {
  const { token, user } = useAuth();
  const isManager = user?.role === "manager";

  const [teams, setTeams] = useState([]);
  const [people, setPeople] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} (new team) | a team
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [teamData, peopleData] = await Promise.all([
        api.get("/teams", token),
        isManager ? api.get("/users", token) : Promise.resolve([]),
      ]);
      setTeams(teamData);
      setPeople(peopleData);
    } catch (err) {
      setError(err.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (team) => {
    if (!window.confirm(`Delete the team "${team.teamName}"?`)) return;
    setError("");
    try {
      await api.del(`/teams/${team._id}`, token);
      await load();
    } catch (err) {
      setError(err.message || "Could not delete the team");
    }
  };

  const inATeam = new Set(teams.flatMap((t) => t.members.map((m) => m._id)));
  const unassigned = people.filter((p) => p.role === "team_member" && p.isActive !== false && !inATeam.has(p._id));

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Teams</h2>
            <p className="text-sm text-slate-500">
              {isManager
                ? "Create teams, choose their leader and members, then link projects to them."
                : "The team you work with."}
            </p>
          </div>
          {isManager && !editing && (
            <button
              onClick={() => setEditing({})}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm"
            >
              New team
            </button>
          )}
        </div>

        {isManager && editing && (
          <TeamForm
            key={editing._id || "new"}
            team={editing}
            teams={teams}
            people={people}
            token={token}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {isManager && unassigned.length > 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            Not in any team yet: {unassigned.map((p) => p.name).join(", ")}
          </p>
        )}

        {loading && <p className="text-slate-400 text-sm">Loading teams...</p>}
        {!loading && teams.length === 0 && (
          <div className="bg-white rounded-xl shadow p-6 text-sm text-slate-400">
            {isManager ? "No teams yet. Click “New team” to create one." : "You are not part of a team yet."}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {teams.map((t) => (
            <div key={t._id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{t.teamName}</h3>
                  <p className="text-sm text-slate-500">
                    Leader: <span className="text-slate-700">{t.leader?.name || "Not assigned"}</span>
                  </p>
                </div>
                {isManager && (
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setEditing(t)} className="text-indigo-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t)} className="text-red-500 hover:underline">
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3 mb-2">Members ({t.members.length})</p>
              {t.members.length === 0 ? (
                <p className="text-sm text-slate-400">No members yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {t.members.map((m) => (
                    <span
                      key={m._id}
                      className={`text-xs rounded-full px-2.5 py-1 ${
                        m.isActive === false ? "bg-red-50 text-red-400 line-through" : "bg-slate-100 text-slate-700"
                      }`}
                      title={m.isActive === false ? "Deactivated" : undefined}
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default TeamsPage;

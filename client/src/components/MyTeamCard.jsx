import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

// Shows a Team Member who they work with. Loads its own data, so it can be dropped into any page.
function MyTeamCard() {
  const { token } = useAuth();
  const [team, setTeam] = useState(undefined); // undefined = loading, null = no team

  useEffect(() => {
    api
      .get("/teams", token)
      .then((teams) => setTeam(teams[0] || null))
      .catch(() => setTeam(null));
  }, [token]);

  if (team === undefined) return null;

  return (
    <div className="bg-white rounded-xl shadow p-5 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">My team</h2>
      {!team ? (
        <p className="text-sm text-slate-400">You are not in a team yet. Your manager will add you to one.</p>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{team.teamName}</span> · Leader:{" "}
            {team.leader?.name || "not assigned yet"}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {team.members.filter((m) => m.isActive !== false).map((m) => (
              <span key={m._id} className="text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-1">
                {m.name}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MyTeamCard;

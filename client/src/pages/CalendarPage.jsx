import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import DeadlineCalendar from "../components/DeadlineCalendar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { dateKey } from "../utils/dates.js";

// One calendar for every role — the API already limits what each role can see:
// Manager = everything, Team Leader = their projects, Team Member = their own tasks.
function CalendarPage() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [taskData, projectData] = await Promise.all([api.get("/tasks", token), api.get("/projects", token)]);
        setTasks(taskData);
        setProjects(projectData);
      } catch (err) {
        setError(err.message || "Failed to load the calendar");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const events = useMemo(() => {
    const list = [];

    for (const t of tasks) {
      if (!t.deadline) continue;
      list.push({
        id: `task-${t._id}`,
        kind: "task",
        dateKey: dateKey(t.deadline),
        title: t.title,
        status: t.status,
        sub: [user.role !== "team_member" && t.assignedUser?.name, t.project?.title].filter(Boolean).join(" · "),
      });
    }

    // A Team Member only sees the due dates of projects they actually have a task in
    const myProjectIds = new Set(tasks.map((t) => t.project?._id).filter(Boolean));
    for (const p of projects) {
      if (!p.endDate) continue;
      if (user.role === "team_member" && !myProjectIds.has(p._id)) continue;
      list.push({
        id: `project-${p._id}`,
        kind: "project",
        dateKey: dateKey(p.endDate),
        title: `${p.title} — project due`,
        status: p.status,
        sub: p.leader?.name ? `Leader: ${p.leader.name}` : "",
      });
    }

    return list;
  }, [tasks, projects, user.role]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-slate-800">Deadline calendar</h1>
          <p className="text-sm text-slate-400">
            Task deadlines and project due dates{" "}
            {user.role === "team_member" ? "for your work" : user.role === "team_leader" ? "for the projects you lead" : "across all projects"}.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {loading ? <p className="text-sm text-slate-400">Loading...</p> : <DeadlineCalendar events={events} />}
      </main>
    </div>
  );
}

export default CalendarPage;

import Navbar from "../components/Navbar.jsx";
import StatCard from "../components/StatCard.jsx";

// Sample/mock data — will be replaced by live API calls (GET /api/projects, etc.)
const sampleProjects = [
  { id: 1, title: "NexOra Platform Revamp", status: "ongoing", leader: "Asha Rao", progress: 62 },
  { id: 2, title: "Client Onboarding Portal", status: "upcoming", leader: "Vikram Shah", progress: 0 },
  { id: 3, title: "Internal Analytics Dashboard", status: "completed", leader: "Meera Nair", progress: 100 },
];

const statusStyles = {
  upcoming: "bg-amber-50 text-amber-600",
  ongoing: "bg-indigo-50 text-indigo-600",
  completed: "bg-emerald-50 text-emerald-600",
};

function ManagerDashboard() {
  const ongoing = sampleProjects.filter((p) => p.status === "ongoing").length;
  const upcoming = sampleProjects.filter((p) => p.status === "upcoming").length;
  const completed = sampleProjects.filter((p) => p.status === "completed").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userName="Manager" />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Overview</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Ongoing" value={ongoing} accent="indigo" />
          <StatCard label="Upcoming" value={upcoming} accent="amber" />
          <StatCard label="Completed" value={completed} accent="green" />
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-4">Projects</h2>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Leader</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
              </tr>
            </thead>
            <tbody>
              {sampleProjects.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.title}</td>
                  <td className="px-4 py-3 text-slate-600">{p.leader}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyles[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/*<p className="text-xs text-slate-400 mt-4">
          Sample data shown above. Once the Project API is connected on the frontend, this table
          will be populated from <code>GET /api/projects</code>.
        </p>*/}
      </main>
    </div>
  );
}

export default ManagerDashboard;

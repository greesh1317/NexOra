import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import TeamLeaderDashboard from "./pages/TeamLeaderDashboard.jsx";
import TeamMemberDashboard from "./pages/TeamMemberDashboard.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import TeamsPage from "./pages/TeamsPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* The deadline calendar is open to every logged-in role (the API limits what each role sees) */}
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />

      {/* Teams: the Manager manages them; leaders and members see their own team (the API limits what each role gets) */}
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <TeamsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager-dashboard"
        element={
          <ProtectedRoute roles={["manager"]}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leader-dashboard"
        element={
          <ProtectedRoute roles={["team_leader"]}>
            <TeamLeaderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member-dashboard"
        element={
          <ProtectedRoute roles={["team_member"]}>
            <TeamMemberDashboard />
          </ProtectedRoute>
        }
      />

      {/* Old Review 1 route kept as a redirect so nothing breaks if bookmarked */}
      <Route path="/dashboard" element={<Navigate to="/manager-dashboard" replace />} />
    </Routes>
  );
}

export default App;

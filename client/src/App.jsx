import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ManagerDashboard />} />
    </Routes>
  );
}

export default App;

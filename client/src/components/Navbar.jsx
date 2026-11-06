import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";
import ChangePasswordModal from "./ChangePasswordModal.jsx";

const roleLabels = {
  manager: "Manager",
  team_leader: "Team Leader",
  team_member: "Team Member",
};

const homeByRole = {
  manager: "/manager-dashboard",
  team_leader: "/leader-dashboard",
  team_member: "/member-dashboard",
};

const linkClass = ({ isActive }) =>
  `text-sm px-3 py-1.5 rounded-lg transition-colors ${
    isActive ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
  }`;

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = user?.name || "Guest";
  const roleLabel = roleLabels[user?.role] || "";

  return (
    <header className="flex items-center justify-between bg-white shadow px-6 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-slate-800">NexOra</h1>
        <nav className="flex items-center gap-1">
          <NavLink to={homeByRole[user?.role] || "/login"} className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/teams" className={linkClass}>
            Teams
          </NavLink>
          {user?.role === "manager" && (
            <>
              <NavLink to="/overview" className={linkClass}>
                Overview
              </NavLink>
              <NavLink to="/people" className={linkClass}>
                People
              </NavLink>
            </>
          )}
          <NavLink to="/calendar" className={linkClass}>
            Calendar
          </NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="text-right">
          <p className="text-sm font-medium text-slate-700 leading-tight">{displayName}</p>
          {roleLabel && <p className="text-xs text-slate-400 leading-tight">{roleLabel}</p>}
        </div>
        <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-medium">
          {displayName.charAt(0)}
        </div>
        <button
          onClick={() => setShowPassword(true)}
          className="text-sm text-slate-500 hover:text-slate-800 px-2 py-1.5"
        >
          Password
        </button>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          Log out
        </button>
      </div>
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </header>
  );
}

export default Navbar;

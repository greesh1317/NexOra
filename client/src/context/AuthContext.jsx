import { createContext, useContext, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

const STORAGE_KEY = "nexora_auth";

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);

  const login = async (email, password) => {
    const data = await api.post("/auth/login", { email, password });
    const authData = {
      token: data.token,
      user: { _id: data._id, name: data.name, email: data.email, role: data.role },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    setAuth(authData);
    return authData;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  };

  const value = {
    user: auth?.user || null,
    token: auth?.token || null,
    isAuthenticated: Boolean(auth?.token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!getToken()) return setUser(false);
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => { setToken(null); setUser(false); });
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setToken(null);
    setUser(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
  }, []);

  return <AuthCtx.Provider value={{ user, login, register, logout, refreshUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

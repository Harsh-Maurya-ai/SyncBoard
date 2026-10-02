import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import {
  ApiError,
  clearToken,
  fetchMe,
  getToken,
  loginUser,
  registerUser,
  setToken,
} from "../api/client";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only need to wait for the server if we already have a saved token
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  // Restore the session on page load
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;

    fetchMe()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The API layer / socket fire this when the token is rejected
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("syncboard:logout", onLogout);
    return () => window.removeEventListener("syncboard:logout", onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginUser(email, password);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await registerUser(name, email, password);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
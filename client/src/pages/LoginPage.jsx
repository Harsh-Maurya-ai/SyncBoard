import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import "./AuthPage.css";

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="page-message">Loading…</div>;
  if (user) return <Navigate to={redirectTo} replace />;

  const isRegister = mode === "register";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
      // once `user` is set, the <Navigate> above sends them to where they were going
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setError("");
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">SyncBoard</h1>
        <p className="auth-subtitle">
          {isRegister ? "Create your account" : "Log in to your boards"}
        </p>

        {isRegister && (
          <label className="auth-field">
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
        )}

        <label className="auth-field">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="auth-field">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}
        </button>

        <button type="button" className="auth-switch" onClick={switchMode}>
          {isRegister
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

// Wrap a page in this to make it login-only. After logging in the user is
// sent back to the page they originally wanted (e.g. an invite link).
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-message">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// UX guard only. Real protection is RLS on the database.
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="p-8 text-slate2" role="status">Loading your session…</p>;
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <Outlet />;
}

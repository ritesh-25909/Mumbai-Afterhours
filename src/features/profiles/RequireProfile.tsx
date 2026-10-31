import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useMyProfile } from './useMyProfile';

// UX gate: sends unpublished users to onboarding. Server-side RPCs also refuse unpublished users.
export function RequireProfile() {
  const { profile, loading, error, reload } = useMyProfile();
  const { signOut } = useAuth();
  if (loading) return <p className="p-8 text-slate2" role="status">Loading…</p>;
  if (error) return <p className="p-8 text-bad" role="alert">{error} <button className="underline" onClick={reload}>Retry</button></p>;
  if (profile?.moderation_status === 'suspended') return (
    <main className="grid min-h-screen place-items-center px-4"><div className="card max-w-md space-y-3 p-6 text-center">
      <h1 className="text-xl font-extrabold">Your account is suspended</h1>
      <p className="text-slate2">Your profile is hidden and you cannot match or chat. If you think this is a mistake, contact support (see Help).</p>
      <div className="flex justify-center gap-3"><Link to="/help" className="btn-outline">Help</Link><button className="btn-outline" onClick={signOut}>Log out</button></div>
      <Link to="/delete-account" className="block text-sm text-slate2 underline">Delete my account</Link></div></main>);
  if (!profile || !profile.profile_complete) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

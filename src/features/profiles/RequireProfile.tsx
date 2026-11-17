
import { Link, Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { useMyProfile } from './useMyProfile';

export function RequireProfile() {
  const {
    profile,
    loading,
    error,
    reload,
  } = useMyProfile();

  const {
    signOut,
    loading: authLoading,
    session,
  } = useAuth();

  if (authLoading || loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-slate2" role="status">
          Loading your profile…
        </p>
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-bold">
            Unable to load your profile
          </h1>

          <p className="text-slate2" role="alert">
            {error}
          </p>

          <button
            className="btn-outline"
            onClick={() => void reload()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  if (profile.moderation_status === 'suspended') {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-extrabold">
            Your account is suspended
          </h1>

          <p className="text-slate2">
            Your profile is hidden and you cannot match or chat.
            If you think this is a mistake, contact support.
          </p>

          <div className="flex justify-center gap-3">
            <Link to="/help" className="btn-outline">
              Help
            </Link>

            <button
              className="btn-outline"
              onClick={() => void signOut()}
            >
              Log out
            </button>
          </div>

          <Link
            to="/delete-account"
            className="block text-sm text-slate2 underline"
          >
            Delete my account
          </Link>
        </div>
      </main>
    );
  }

  // Profile completion must happen before verification review.
  if (!profile.profile_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  // Pending profiles cannot access protected member features.
  if (profile.moderation_status === 'pending') {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <div className="card w-full max-w-md space-y-5 p-7 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-blue-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2456B8"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold">
              Your profile is under review
            </h1>

            <p className="text-slate2">
              Thank you for completing your profile. Our moderation
              team is currently reviewing your profile and verification
              photos.
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-left">
            <p className="font-semibold text-blue-900">
              What happens next?
            </p>

            <p className="mt-2 text-sm text-blue-800">
              Once our team completes the review, you will be able
              to access Mumbai Afterhours.
            </p>
          </div>

          <p className="text-sm text-slate2">
            Your profile will not appear in Discover while it is
            under review.
          </p>

          <button
            className="btn-outline w-full"
            onClick={() => void signOut()}
          >
            Log out
          </button>
        </div>
      </main>
    );
  }

  // Rejected profiles must be resubmitted for review.
  if (profile.moderation_status === 'rejected') {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-extrabold">
            Profile verification unsuccessful
          </h1>

          <p className="text-slate2">
            Your profile has not been approved. Please review the
            feedback from our moderation team and resubmit your
            verification.
          </p>

          <Link to="/verify" className="btn-primary block w-full">
            Resubmit verification
          </Link>

          <button
            className="btn-outline w-full"
            onClick={() => void signOut()}
          >
            Log out
          </button>
        </div>
      </main>
    );
  }

  // Only approved profiles can access protected member features.
  if (profile.moderation_status !== 'approved') {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-bold">
            Verification required
          </h1>

          <p className="text-slate2">
            Your profile must be reviewed before you can access
            Mumbai Afterhours.
          </p>

          <button
            className="btn-outline w-full"
            onClick={() => void reload()}
          >
            Check status again
          </button>

          <button
            className="btn-outline w-full"
            onClick={() => void signOut()}
          >
            Log out
          </button>
        </div>
      </main>
    );
  }

  return <Outlet />;
}

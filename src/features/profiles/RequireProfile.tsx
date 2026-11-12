
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useMyProfile } from './useMyProfile';
import { supabase } from '../../lib/supabase';
import type { Profile } from './api';

// Local extension: avoids requiring an immediate change to api.ts.
type ProfileWithVerificationNotice = Profile & {
  verification_notice_seen_at?: string | null;
};

function VerificationPending({
  firstNotice,
  onRefresh,
  onSignOut,
}: {
  firstNotice: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4 py-10">
      <section className="card w-full max-w-md space-y-5 p-7 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-3xl">
          🛡️
        </div>

        {firstNotice ? (
          <>
            <h1 className="text-2xl font-extrabold">
              Your profile is being verified
            </h1>

            <p className="text-sm leading-6 text-slate2">
              Thank you for joining Mumbai Afterhours!
            </p>

            <p className="text-sm leading-6 text-slate2">
              Your profile is currently under verification. We'll notify you
              once your profile has been successfully verified.
            </p>

            <p className="text-sm text-slate2">
              Thank you for your patience!
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold">
              Your profile is under review
            </h1>

            <p className="text-sm leading-6 text-slate2">
              Your verification is still pending. Please check again later.
            </p>
          </>
        )}

        <div
          className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800"
          role="status"
        >
          Verification in progress
        </div>

        <button
          type="button"
          className="btn-primary w-full"
          onClick={onRefresh}
        >
          Check verification status
        </button>

        <button
          type="button"
          className="btn-outline w-full"
          onClick={onSignOut}
        >
          Log out
        </button>
      </section>
    </main>
  );
}

export function RequireProfile() {
  const { profile, loading, error, reload } = useMyProfile();
  const { signOut } = useAuth();

  const [firstNotice, setFirstNotice] = useState(true);

  const profileWithNotice =
    profile as ProfileWithVerificationNotice | null;

  useEffect(() => {
    if (
      !profileWithNotice ||
      !profileWithNotice.profile_complete ||
      profileWithNotice.moderation_status !== 'pending'
    ) {
      return;
    }

    const noticeAlreadySeen =
      !!profileWithNotice.verification_notice_seen_at;

    setFirstNotice(!noticeAlreadySeen);

    if (!noticeAlreadySeen) {
      void supabase.rpc('mark_my_verification_notice_seen').then(
        ({ error: rpcError }) => {
          if (rpcError) {
            console.error(
              'Could not save verification notice:',
              rpcError.message
            );
          }
        }
      );
    }
  }, [
    profileWithNotice?.id,
    profileWithNotice?.profile_complete,
    profileWithNotice?.moderation_status,
    profileWithNotice?.verification_notice_seen_at,
  ]);

  if (loading) {
    return (
      <p className="p-8 text-slate2" role="status">
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <p className="p-8 text-bad" role="alert">
        {error}{' '}
        <button className="underline" onClick={() => void reload()}>
          Retry
        </button>
      </p>
    );
  }

  if (profile?.moderation_status === 'suspended') {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="card max-w-md space-y-3 p-6 text-center">
          <h1 className="text-xl font-extrabold">
            Your account is suspended
          </h1>

          <p className="text-slate2">
            Your profile is hidden and you cannot match or chat. If you think
            this is a mistake, contact support (see Help).
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

  if (!profile || !profile.profile_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  if (profile.moderation_status === 'pending') {
    return (
      <VerificationPending
        firstNotice={firstNotice}
        onRefresh={() => void reload()}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (profile.moderation_status === 'rejected') {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-extrabold">
            Your profile needs attention
          </h1>

          <p className="text-sm leading-6 text-slate2">
            We couldn't approve your profile at this time. Please contact
            our support team for assistance.
          </p>

          <Link to="/help" className="btn-primary block">
            Contact support
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

  return <Outlet />;
}


import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useMyProfile } from './useMyProfile';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../components/ui/Logo';

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
        <div className="flex justify-center">
          <Logo light={false} />
        </div>

        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-3xl"
          aria-hidden="true"
        >
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
              Your verification is still pending. You can check again here
              once our team has reviewed your profile.
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

  const [firstNotice, setFirstNotice] = useState<boolean | null>(null);

  useEffect(() => {
    if (
      !profile?.profile_complete ||
      profile.moderation_status !== 'pending'
    ) {
      return;
    }

    const isFirstNotice = !profile.verification_notice_seen_at;

    setFirstNotice(isFirstNotice);

    if (isFirstNotice) {
      void supabase.rpc('mark_my_verification_notice_seen').then(
        ({ error: rpcError }) => {
          if (rpcError) {
            console.error(
              'Could not save verification notice state:',
              rpcError.message
            );
          }
        }
      );
    }
  }, [
    profile?.id,
    profile?.profile_complete,
    profile?.moderation_status,
    profile?.verification_notice_seen_at,
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
        <button className="underline" onClick={reload}>
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

            <button className="btn-outline" onClick={signOut}>
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
        firstNotice={firstNotice ?? !profile.verification_notice_seen_at}
        onRefresh={() => void reload()}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (profile.moderation_status === 'rejected') {
    return (
      <main className="grid min-h-screen place-items-center bg-ink px-4">
        <div className="card max-w-md space-y-4 p-6 text-center">
          <h1 className="text-xl font-extrabold">
            Your profile needs attention
          </h1>

          <p className="text-sm leading-6 text-slate2">
            We couldn't approve your profile at this time. Please contact our
            support team for assistance.
          </p>

          <Link to="/help" className="btn-primary block">
            Contact support
          </Link>

          <button className="btn-outline w-full" onClick={signOut}>
            Log out
          </button>
        </div>
      </main>
    );
  }

  return <Outlet />;
}

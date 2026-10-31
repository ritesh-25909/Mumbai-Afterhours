
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { appUrl } from '../lib/constants';
import { useAuth } from '../features/auth/AuthProvider';
import { Logo } from '../components/ui/Logo';

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/discover" replace />;

  async function google() {
    setError(null);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Check your environment variables.');
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: appUrl('/'),
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to continue with Google. Please try again.'
      );
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <div className="card space-y-5 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold">
              {mode === 'signup'
                ? 'Join Mumbai Afterhours'
                : 'Welcome to Mumbai Afterhours'}
            </h1>

            <p className="mt-2 text-sm text-slate2">
              Meet someone beyond the ordinary.
            </p>
          </div>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="btn-outline flex w-full items-center justify-center gap-3"
          >
            {busy ? (
              'Connecting to Google…'
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.64 5.93c4.46-4.12 7.13-10.19 7.13-17.58z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.86.93 7.51 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.91-5.87l-7.64-5.93c-2.12 1.42-4.84 2.26-8.27 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {error && (
            <p role="alert" className="text-center text-sm text-bad">
              {error}
            </p>
          )}

          <p className="text-center text-xs leading-5 text-slate2">
            By continuing, you confirm that you are 18 or older and agree to
            our{' '}
            <Link className="text-royal underline" to="/terms">
              Terms
            </Link>{' '}
            and{' '}
            <Link className="text-royal underline" to="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

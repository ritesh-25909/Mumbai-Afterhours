
import { useEffect, useState } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
} from 'react-router-dom';

import LandingPage from '../pages/LandingPage';
import AuthPage from '../pages/AuthPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { RequireProfile } from '../features/profiles/RequireProfile';
import { AppShell } from '../components/layout/AppShell';
import { useAuth } from '../features/auth/AuthProvider';

import OnboardingPage from '../pages/OnboardingPage';
import ProfileSettingsPage from '../pages/ProfileSettingsPage';
import UserProfilePage from '../pages/UserProfilePage';
import SelfieVerificationPage from '../pages/SelfieVerificationPage';
import ModerationPage from '../pages/ModerationPage';
import DiscoverPage from '../pages/DiscoverPage';
import MatchesPage from '../pages/MatchesPage';
import ChatPage from '../pages/ChatPage';
import SubscriptionPage from '../pages/SubscriptionPage';
import ReferralPage from '../pages/ReferralPage';
import AccountSettingsPage from '../pages/AccountSettingsPage';
import PrivacySettingsPage from '../pages/PrivacySettingsPage';
import DeleteAccountPage from '../pages/DeleteAccountPage';
import ModerationReportsPage from '../pages/ModerationReportsPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import EmailVerificationPage from '../pages/EmailVerificationPage';

// Existing Admin Command Center dashboard
import AdminDashboard from '../admin/pages/AdminDashboard';

import { myRoles } from '../features/verification/api';

import {
  SafetyPage,
  TermsPage,
  PrivacyPage,
  HelpPage,
} from '../pages/LegalPages';

/* =====================================================
   PUBLIC LANDING REDIRECT
===================================================== */

function LandingRoute() {
  const { session } = useAuth();

  if (session?.user?.id) {
    return <Navigate to="/discover" replace />;
  }

  return <LandingPage />;
}

/* =====================================================
   ADMIN AUTHORIZATION
===================================================== */

function AdminRoute() {
  const { session } = useAuth();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminAccess() {
      setChecking(true);
      setAuthorized(false);
      setError(null);

      try {
        const roles = await myRoles();

        if (cancelled) return;

        const hasAdminAccess =
          roles.includes('admin') ||
          roles.includes('super_admin') ||
          roles.includes('moderator');

        setAuthorized(hasAdminAccess);
      } catch (err) {
        if (cancelled) return;

        console.error('Admin authorization failed:', err);

        setError(
          'Could not verify administrator permissions. Please retry.'
        );
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    if (session?.user?.id) {
      void checkAdminAccess();
    } else {
      setChecking(false);
      setAuthorized(false);
    }

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  if (checking) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-sm font-semibold text-slate-500">
          Verifying administrator access...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center">
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-[#174fc5] px-5 py-2.5 font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/discover" replace />;
  }

  return <Outlet />;
}

/* =====================================================
   ROUTER
===================================================== */

export const router = createBrowserRouter(
  [
    // PUBLIC ROUTES
    {
      path: '/',
      element: <LandingRoute />,
    },
    {
      path: '/login',
      element: <AuthPage mode="login" />,
    },
    {
      path: '/signup',
      element: <AuthPage mode="signup" />,
    },
    {
      path: '/verify-email',
      element: <EmailVerificationPage />,
    },
    {
      path: '/reset-password',
      element: <ResetPasswordPage />,
    },
    {
      path: '/safety',
      element: <SafetyPage />,
    },
    {
      path: '/terms',
      element: <TermsPage />,
    },
    {
      path: '/privacy',
      element: <PrivacyPage />,
    },
    {
      path: '/help',
      element: <HelpPage />,
    },

    // AUTHENTICATION PROTECTION
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: '/onboarding',
          element: <OnboardingPage />,
        },
        {
          path: '/delete-account',
          element: <DeleteAccountPage />,
        },

        // PROFILE PROTECTION
        {
          element: <RequireProfile />,
          children: [
            {
              element: <AppShell />,
              children: [
                {
                  path: '/discover',
                  element: <DiscoverPage />,
                },
                {
                  path: '/matches',
                  element: <MatchesPage />,
                },
                {
                  path: '/inbox',
                  element: <ChatPage />,
                },
                {
                  path: '/chat/:id',
                  element: <ChatPage />,
                },
                {
                  path: '/user/:userId',
                  element: <UserProfilePage />,
                },
                {
                  path: '/profile',
                  element: <ProfileSettingsPage />,
                },
                {
                  path: '/verify',
                  element: <SelfieVerificationPage />,
                },
                {
                  path: '/moderation',
                  element: <ModerationPage />,
                },
                {
                  path: '/moderation/reports',
                  element: <ModerationReportsPage />,
                },
                {
                  path: '/settings',
                  element: <AccountSettingsPage />,
                },
                {
                  path: '/subscription',
                  element: <SubscriptionPage />,
                },
                {
                  path: '/referrals',
                  element: <ReferralPage />,
                },
                {
                  path: '/settings/privacy',
                  element: <PrivacySettingsPage />,
                },

                // ADMIN COMMAND CENTER
                {
                  element: <AdminRoute />,
                  children: [
                    {
                      path: '/admin',
                      element: <AdminDashboard />,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // UNKNOWN ROUTES
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ],
  {
    basename:
      import.meta.env.BASE_URL.replace(/\/$/, '') || undefined,
  }
);

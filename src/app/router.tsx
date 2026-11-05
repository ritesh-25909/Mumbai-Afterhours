
import { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import LandingPage from '../pages/LandingPage';
import AuthPage from '../pages/AuthPage';
import TrustIntroduction from '../components/TrustIntroduction';

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
import AccountSettingsPage from '../pages/AccountSettingsPage';
import PrivacySettingsPage from '../pages/PrivacySettingsPage';
import DeleteAccountPage from '../pages/DeleteAccountPage';
import ModerationReportsPage from '../pages/ModerationReportsPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import EmailVerificationPage from '../pages/EmailVerificationPage';

import {
  SafetyPage,
  TermsPage,
  PrivacyPage,
  HelpPage,
} from '../pages/LegalPages';

const TRUST_INTRO_KEY = 'ma_trust_intro_completed_v1';

/* =====================================================
   PUBLIC LANDING REDIRECT + TRUST INTRODUCTION
===================================================== */

function LandingRoute() {
  const { session, loading } = useAuth();

  const [introCompleted, setIntroCompleted] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  // Read onboarding status once.
  useEffect(() => {
    try {
      setIntroCompleted(
        localStorage.getItem(TRUST_INTRO_KEY) === 'true'
      );
    } catch (error) {
      console.warn('Could not read introduction status:', error);
    } finally {
      setIntroChecked(true);
    }
  }, []);

  // Never display the introduction while Supabase is restoring a session.
  if (loading || !introChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
      </div>
    );
  }

  // Authenticated users always go directly to Discover.
  if (session?.user?.id) {
    return <Navigate to="/discover" replace />;
  }

  // First-time visitors see the three trust screens.
  if (!introCompleted) {
    return (
      <TrustIntroduction
        onComplete={() => {
          try {
            localStorage.setItem(TRUST_INTRO_KEY, 'true');
          } catch (error) {
            console.warn('Could not save introduction status:', error);
          }

          setIntroCompleted(true);
        }}
      />
    );
  }

  // Visitors who have already completed the introduction
  // see the existing landing page.
  return <LandingPage />;
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
                  path: '/settings/privacy',
                  element: <PrivacySettingsPage />,
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

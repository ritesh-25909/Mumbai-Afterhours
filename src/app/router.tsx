
import { createBrowserRouter, Navigate } from 'react-router-dom';

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
import { AdminGuard } from '../admin/AdminGuard';
import { AdminLayout } from '../admin/components/AdminLayout';
import AdminDashboard from '../admin/pages/AdminDashboard';
import {AdminUsers,AdminRoles,AdminCurated,AdminAudit,AdminRiskQueue,AdminAnnouncements,AdminHealth,AdminExport} from '../admin/pages/AdminOperations';

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
          path: '/admin',
          element: <AdminGuard><AdminLayout /></AdminGuard>,
          children: [
            { index: true, element: <AdminDashboard /> },
            { path: 'moderation', element: <ModerationPage /> },
            { path: 'reports', element: <ModerationReportsPage /> },
            { path: 'users', element: <AdminUsers /> },
            { path: 'permissions', element: <AdminRoles /> },
            { path: 'recommendations', element: <AdminCurated /> },
            { path: 'audit', element: <AdminAudit /> },
            { path: 'risk-review', element: <AdminRiskQueue /> },
            { path: 'announcements', element: <AdminAnnouncements /> },
            { path: 'exports', element: <AdminExport /> },
            { path: 'health', element: <AdminHealth /> },
            { path: 'engagement', element: <Navigate to="/admin" replace /> },
            { path: 'analytics', element: <Navigate to="/admin" replace /> },
            { path: 'moderation-center', element: <Navigate to="/admin/reports" replace /> },
            { path: 'admin-users', element: <Navigate to="/admin/permissions" replace /> },
            { path: 'settings', element: <Navigate to="/admin/health" replace /> },
          ],
        },
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
                  path: '/settings/referrals',
                  element: <ReferralPage />,
                },
                {
                  path: '/referrals',
                  element: <Navigate to="/settings/referrals" replace />,
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

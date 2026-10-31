import { createBrowserRouter } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import AuthPage from '../pages/AuthPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { RequireProfile } from '../features/profiles/RequireProfile';
import { AppShell } from '../components/layout/AppShell';
import OnboardingPage from '../pages/OnboardingPage';
import ProfileSettingsPage from '../pages/ProfileSettingsPage';
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
import { SafetyPage, TermsPage, PrivacyPage, HelpPage } from '../pages/LegalPages';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <AuthPage mode="login" /> },
  { path: '/signup', element: <AuthPage mode="signup" /> },
  { path: '/verify-email', element: <EmailVerificationPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/safety', element: <SafetyPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/help', element: <HelpPage /> },
  { element: <ProtectedRoute />, children: [
    { path: '/onboarding', element: <OnboardingPage /> },
    { path: '/delete-account', element: <DeleteAccountPage /> },
    { element: <RequireProfile />, children: [
      { element: <AppShell />, children: [
        { path: '/discover', element: <DiscoverPage /> },
        { path: '/matches', element: <MatchesPage /> },
        { path: '/inbox', element: <ChatPage /> },
        { path: '/chat/:id', element: <ChatPage /> },
        { path: '/profile', element: <ProfileSettingsPage /> },
        { path: '/verify', element: <SelfieVerificationPage /> },
        { path: '/moderation', element: <ModerationPage /> },
        { path: '/moderation/reports', element: <ModerationReportsPage /> },
        { path: '/settings', element: <AccountSettingsPage /> },
        { path: '/subscription', element: <SubscriptionPage /> },
        { path: '/settings/privacy', element: <PrivacySettingsPage /> }
      ] }
    ] }
  ] }
], { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || undefined });


import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getMyProfile, type Profile } from './api';

export function useMyProfile() {
  const { session, loading: authLoading } = useAuth();
  const uid = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!uid) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const existingProfile = await getMyProfile(uid);
      setProfile(existingProfile);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Could not load your profile';

      setError(message);
      console.error('Profile loading failed:', message);
    } finally {
      setLoading(false);
    }
  }, [uid, authLoading]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Refresh when the user returns to the application.
  useEffect(() => {
    if (!uid || authLoading) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reload();
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [uid, authLoading, reload]);

  // Periodically check for moderator approval.
  useEffect(() => {
    if (!uid || authLoading) return;

    const interval = window.setInterval(() => {
      void reload();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [uid, authLoading, reload]);

  return {
    uid,
    profile,
    loading: authLoading || loading,
    error,
    reload,
  };
}

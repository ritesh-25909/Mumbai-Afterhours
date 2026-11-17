
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
    if (authLoading) return;

    if (!uid) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

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
    }
  }, [uid, authLoading]);

  // Initial profile loading.
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    let active = true;

    const loadInitialProfile = async () => {
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
        if (active) setProfile(existingProfile);
      } catch (e) {
        if (active) {
          const message =
            e instanceof Error
              ? e.message
              : 'Could not load your profile';

          setError(message);
          console.error('Profile loading failed:', message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadInitialProfile();

    return () => {
      active = false;
    };
  }, [uid, authLoading]);

  // Refresh when the user returns to the application.
  useEffect(() => {
    if (!uid || authLoading) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void reload();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        void reload();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [uid, authLoading, reload]);

  return {
    uid,
    profile,
    loading: authLoading || loading,
    error,
    reload,
  };
}

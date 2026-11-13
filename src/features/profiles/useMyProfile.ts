
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
    // Wait until Supabase finishes restoring the saved session.
    if (authLoading) {
      setLoading(true);
      return;
    }

    // No authenticated user after initialization.
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

  return {
    uid,
    profile,
    loading: authLoading || loading,
    error,
    reload,
  };
}

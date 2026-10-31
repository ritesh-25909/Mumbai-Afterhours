import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getMyProfile, type Profile } from './api';

export function useMyProfile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!uid) return;
    setLoading(true); setError(null);
    try { setProfile(await getMyProfile(uid)); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { reload(); }, [reload]);
  return { uid, profile, loading, error, reload };
}

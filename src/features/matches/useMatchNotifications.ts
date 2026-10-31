import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Set by Discover when this user's own like created a match, so the shell does not announce it twice.
export const localMatches = new Set<string>();

export function useMatchNotifications(uid: string | undefined) {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(`matches:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, payload => {
        const m = payload.new as { id: string; user_a_id: string; user_b_id: string };
        if ((m.user_a_id === uid || m.user_b_id === uid) && !localMatches.has(m.id)) setNotice(m.id);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);
  return { notice, dismiss: () => setNotice(null) };
}

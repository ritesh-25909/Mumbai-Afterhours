import { supabase } from '../../lib/supabase';
import { signPhotoPaths } from '../discovery/api';

export type MatchItem = { match_id: string; conversation_id: string; user_id: string; display_name: string; age: number; verified: boolean;
  photo_path: string | null; matched_at: string; photoUrl: string | null };

export async function listMatches(): Promise<MatchItem[]> {
  const { data, error } = await supabase.rpc('list_matches');
  if (error) throw new Error('Could not load your matches. Check your connection and try again.');
  const rows = (data ?? []) as Omit<MatchItem, 'photoUrl'>[];
  const urls = await signPhotoPaths(rows.map(r => r.photo_path).filter((p): p is string => !!p));
  return rows.map(r => ({ ...r, photoUrl: r.photo_path ? urls[r.photo_path] ?? null : null }));
}

export async function unmatch(id: string) {
  const { error } = await supabase.rpc('unmatch', { mid: id });
  if (error) throw new Error('Could not unmatch. Try again.');
}

const SEEN_KEY = 'ma_matches_seen_at';
export const getSeenAt = () => { try { return localStorage.getItem(SEEN_KEY) ?? ''; } catch { return ''; } };
export const markSeen = () => { try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /* storage unavailable */ } };

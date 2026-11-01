
import { supabase } from '../../lib/supabase';
import { signPhotoPaths, likeUser, passUser } from '../discovery/api';

// ==========================================
// TYPES
// ==========================================

export type MatchItem = {
  match_id: string;
  conversation_id: string;
  user_id: string;
  display_name: string;
  age: number;
  verified: boolean;
  photo_path: string | null;
  matched_at: string;
  photoUrl: string | null;
};

export type IncomingLike = {
  user_id: string;
  display_name: string;
  age: number;
  verified: boolean;
  photo_path: string | null;
  liked_at: string;
  photoUrl: string | null;
};

// ==========================================
// LIKED YOU - INCOMING LIKES
// ==========================================

export async function listIncomingLikes(): Promise<IncomingLike[]> {
  const { data, error } = await supabase.rpc('list_incoming_likes');

  if (error) {
    throw new Error(
      'Could not load incoming likes. Please try again.'
    );
  }

  const rows = (data ?? []) as Omit<IncomingLike, 'photoUrl'>[];

  const urls = await signPhotoPaths(
    rows
      .map(r => r.photo_path)
      .filter((p): p is string => !!p)
  );

  return rows.map(r => ({
    ...r,
    photoUrl: r.photo_path
      ? urls[r.photo_path] ?? null
      : null
  }));
}

// ==========================================
// LIKE BACK
// ==========================================

export async function likeBack(userId: string) {
  if (!userId) {
    throw new Error('Invalid user.');
  }

  return await likeUser(userId);
}

// ==========================================
// PASS INCOMING LIKE
// ==========================================

export async function passIncomingLike(userId: string) {
  if (!userId) {
    throw new Error('Invalid user.');
  }

  await passUser(userId);
}

// ==========================================
// EXISTING MATCHES - PRESERVED
// ==========================================

export async function listMatches(): Promise<MatchItem[]> {
  const { data, error } = await supabase.rpc('list_matches');

  if (error) {
    throw new Error(
      'Could not load your matches. Check your connection and try again.'
    );
  }

  const rows = (data ?? []) as Omit<MatchItem, 'photoUrl'>[];

  const urls = await signPhotoPaths(
    rows
      .map(r => r.photo_path)
      .filter((p): p is string => !!p)
  );

  return rows.map(r => ({
    ...r,
    photoUrl: r.photo_path
      ? urls[r.photo_path] ?? null
      : null
  }));
}

// ==========================================
// UNMATCH - PRESERVED
// ==========================================

export async function unmatch(id: string) {
  const { error } = await supabase.rpc('unmatch', {
    mid: id
  });

  if (error) {
    throw new Error('Could not unmatch. Try again.');
  }
}

// ==========================================
// EXISTING MATCH NOTIFICATION TRACKING
// ==========================================

const SEEN_KEY = 'ma_matches_seen_at';

export const getSeenAt = () => {
  try {
    return localStorage.getItem(SEEN_KEY) ?? '';
  } catch {
    return '';
  }
};

export const markSeen = () => {
  try {
    localStorage.setItem(
      SEEN_KEY,
      new Date().toISOString()
    );
  } catch {
    // Storage unavailable
  }
};

import { supabase } from '../../lib/supabase';

export type Candidate = {
  id: string; display_name: string; age: number; neighbourhood: string | null; bio: string | null; interests: string[];
  languages: string[]; relationship_intention: string | null; verified: boolean; photo_paths: string[]; photoUrls: string[];
};

export async function signPhotoPaths(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from('profile-photos').createSignedUrls(paths, 3600);
  if (error) throw new Error('Could not load photos.');
  const map: Record<string, string> = {};
  data?.forEach(d => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
  return map;
}

export async function fetchCandidates(): Promise<Candidate[]> {
  // Always offset 0: acted-on profiles drop out of results, so the first page is always the next unseen set.
  const { data, error } = await supabase.rpc('discover_profiles', { page_size: 10, page_offset: 0 });
  if (error) throw new Error('Could not load profiles. Check your connection and try again.');
  const rows = (data ?? []) as Omit<Candidate, 'photoUrls'>[];
  const urls = await signPhotoPaths(rows.flatMap(r => r.photo_paths));
  return rows.map(r => ({ ...r, photoUrls: r.photo_paths.map(p => urls[p]).filter(Boolean) }));
}

export async function likeUser(id: string): Promise<{ matched: boolean; match_id: string | null }> {
  const { data, error } = await supabase.rpc('like_user', { target: id });
  if (error) throw new Error(error.message === 'Unavailable.' ? 'This profile is no longer available.' : error.message);
  return data as { matched: boolean; match_id: string | null };
}

export async function passUser(id: string) {
  const { error } = await supabase.rpc('pass_user', { target: id });
  if (error) throw new Error('Could not record that. Try again.');
}

export async function blockUser(id: string) {
  const { error } = await supabase.rpc('block_user', { target: id });
  if (error) throw new Error('Could not block this person. Try again.');
}

export const REPORT_CATEGORIES: Record<string, string> = {
  fake_profile: 'Fake profile', impersonation: 'Impersonation', harassment: 'Harassment', inappropriate_content: 'Inappropriate content',
  spam_scam: 'Spam or scam', suspected_underage: 'Suspected underage user', other: 'Other safety concern'
};

export async function reportUser(reporter: string, reported: string, category: string, description: string) {
  const { error } = await supabase.from('user_reports').insert({ reporter_user_id: reporter, reported_user_id: reported, category, description: description || null });
  if (error) throw new Error('Could not send your report. Try again.');
}

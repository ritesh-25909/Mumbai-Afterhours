import { supabase } from '../../lib/supabase';
import { POLICY_VERSION } from '../../lib/constants';

export type VStatus = 'pending' | 'approved' | 'rejected' | 'retry';
export type VRequest = { id: string; status: VStatus; submitted_at: string; rejection_reason_code: string | null };

export const REASONS: Record<string, string> = {
  face_not_visible: 'Your face was not clearly visible.',
  photos_dont_match: 'The selfie did not match your profile photos.',
  unclear_image: 'The image was too dark or blurry.',
  other: 'The selfie could not be approved.'
};

export async function getLatestRequest(uid: string): Promise<VRequest | null> {
  const { data, error } = await supabase.from('verification_requests').select('id,status,submitted_at,rejection_reason_code')
    .eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error('Could not load your verification status.');
  return data as VRequest | null;
}

export async function submitSelfie(uid: string, blob: Blob) {
  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from('verification-selfies').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (up.error) throw new Error('Upload failed. Check your connection and retry.');
  const { error } = await supabase.rpc('submit_verification', { p_selfie_path: path, p_consent: true, p_policy_version: POLICY_VERSION });
  if (error) {
    await supabase.storage.from('verification-selfies').remove([path]);
    throw new Error(error.message);
  }
}

export type Pending = { request_id: string; user_id: string; display_name: string; submitted_at: string; selfie_path: string; photo_paths: string[] };
export const listPending = async (): Promise<Pending[]> => {
  const { data, error } = await supabase.rpc('list_pending_verifications');
  if (error) throw new Error(error.message);
  return data as Pending[];
};
export async function review(id: string, decision: 'approved' | 'rejected' | 'retry', reason?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('review_verification', { p_request: id, p_decision: decision, p_reason: reason ?? null });
  if (error) throw new Error(error.message);
  // The selfie is deleted as soon as the decision is recorded. Returns false if file deletion failed.
  const del = await supabase.storage.from('verification-selfies').remove([data as string]);
  return !del.error;
}
export async function myRoles(): Promise<string[]> {
  const { data, error } = await supabase.rpc('my_roles');
  if (error) {
    console.error('MY ROLES RPC ERROR:', error);
    throw new Error(error.message || 'Could not verify account permissions.');
  }
  return (data as string[]) ?? [];
}

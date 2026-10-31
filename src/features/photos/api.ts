import { supabase } from '../../lib/supabase';

export type Photo = { id: string; storage_path: string; display_order: number; url: string };

export async function listMyPhotos(uid: string): Promise<Photo[]> {
  const { data, error } = await supabase.from('profile_photos').select('id,storage_path,display_order').eq('user_id', uid).order('display_order');
  if (error) throw new Error('Could not load your photos.');
  if (!data?.length) return [];
  const { data: signed, error: e2 } = await supabase.storage.from('profile-photos').createSignedUrls(data.map(p => p.storage_path), 3600);
  if (e2) throw new Error('Could not load your photos.');
  return data.map((p, i) => ({ ...p, url: signed?.[i]?.signedUrl ?? '' }));
}

// Upload first, then swap atomically on the server (replace_photo confirms the object exists).
export async function savePhoto(uid: string, order: number, blob: Blob) {
  const path = `${uid}/${crypto.randomUUID()}.webp`;
  const up = await supabase.storage.from('profile-photos').upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (up.error) throw new Error(up.error.message.toLowerCase().includes('quota') ? 'Storage is full. Contact support.' : 'Upload failed. Check your connection and retry.');
  const { data: oldPath, error } = await supabase.rpc('replace_photo', { p_order: order, p_path: path });
  if (error) {
    await supabase.storage.from('profile-photos').remove([path]);
    throw new Error('Could not save the photo. Retry.');
  }
  if (oldPath) await supabase.storage.from('profile-photos').remove([oldPath as string]);
}

export async function removePhoto(p: Photo) {
  const del = await supabase.from('profile_photos').delete().eq('id', p.id);
  if (del.error) throw new Error('Could not remove the photo.');
  await supabase.storage.from('profile-photos').remove([p.storage_path]);
}

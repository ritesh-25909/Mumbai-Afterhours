
import { supabase } from '../../lib/supabase';

export type Photo = {
  id: string;
  storage_path: string;
  display_order: number;
  url: string;
  prompt: string | null;
};

export async function listMyPhotos(uid: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('profile_photos')
    .select('id,storage_path,display_order,prompt')
    .eq('user_id', uid)
    .order('display_order');

  if (error) {
    throw new Error('Could not load your photos.');
  }

  if (!data?.length) return [];

  const { data: signed, error: signedError } = await supabase
    .storage
    .from('profile-photos')
    .createSignedUrls(
      data.map(photo => photo.storage_path),
      3600,
    );

  if (signedError) {
    throw new Error('Could not load your photos.');
  }

  return data.map((photo, index) => ({
    ...photo,
    prompt: photo.prompt ?? null,
    url: signed?.[index]?.signedUrl ?? '',
  }));
}

/**
 * Save a prompt against an existing photo slot.
 * Passing null clears the optional prompt.
 */
export async function updatePhotoPrompt(
  uid: string,
  order: number,
  prompt: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('profile_photos')
    .update({ prompt })
    .eq('user_id', uid)
    .eq('display_order', order)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    throw new Error('Could not find your photo to save its prompt.');
  }
}

// Upload first, then swap atomically on the server.
export async function savePhoto(
  uid: string,
  order: number,
  blob: Blob,
  prompt: string | null = null,
): Promise<void> {
  const path = `${uid}/${crypto.randomUUID()}.webp`;

  const upload = await supabase
    .storage
    .from('profile-photos')
    .upload(path, blob, {
      contentType: 'image/webp',
      upsert: false,
    });

  if (upload.error) {
    throw new Error(
      upload.error.message.toLowerCase().includes('quota')
        ? 'Storage is full. Contact support.'
        : 'Upload failed. Check your connection and retry.',
    );
  }

  const { data: oldPath, error } = await supabase.rpc(
    'replace_photo',
    {
      p_order: order,
      p_path: path,
    },
  );

  if (error) {
    await supabase.storage
      .from('profile-photos')
      .remove([path]);

    throw new Error('Could not save the photo. Retry.');
  }

  // Save the selected prompt on the newly uploaded photo.
  const { data: savedPhoto, error: promptError } = await supabase
    .from('profile_photos')
    .update({ prompt })
    .eq('user_id', uid)
    .eq('display_order', order)
    .select('id');

  if (promptError || !savedPhoto?.length) {
    throw new Error(
      'Photo uploaded, but its prompt could not be saved. Please select the prompt again.',
    );
  }

  // Delete the old storage object only after the new photo is saved.
  if (oldPath) {
    await supabase.storage
      .from('profile-photos')
      .remove([oldPath as string]);
  }
}

export async function removePhoto(p: Photo): Promise<void> {
  const { error } = await supabase
    .from('profile_photos')
    .delete()
    .eq('id', p.id);

  if (error) {
    throw new Error('Could not remove the photo.');
  }

  await supabase.storage
    .from('profile-photos')
    .remove([p.storage_path]);
}

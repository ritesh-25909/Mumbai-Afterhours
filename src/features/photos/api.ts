import { supabase } from '../../lib/supabase';

export type Photo = {
  id: string;
  storage_path: string;
  display_order: number;
  prompt: string | null;
  url: string;
};

const PHOTO_BUCKET = 'profile-photos';

export async function listMyPhotos(uid: string): Promise<Photo[]> {
  if (!uid) {
    throw new Error('You must be logged in to load photos.');
  }

  const { data, error } = await supabase
    .from('profile_photos')
    .select('id, storage_path, display_order, prompt')
    .eq('user_id', uid)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('listMyPhotos error:', error);
    throw new Error('Could not load your photos. Please retry.');
  }

  if (!data?.length) return [];

  const { data: signed, error: signedError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(
      data.map(photo => photo.storage_path),
      3600,
    );

  if (signedError) {
    console.error('Photo signed URL error:', signedError);
    throw new Error('Could not load your photo previews.');
  }

  return data.map((photo, index) => ({
    ...photo,
    prompt: photo.prompt ?? null,
    url: signed?.[index]?.signedUrl ?? '',
  }));
}

/**
 * Saves a prompt against the currently authenticated user's photo slot.
 * The SQL function uses auth.uid(), so a user cannot update another
 * user's photo prompt.
 */
export async function updatePhotoPrompt(
  uid: string,
  order: number,
  prompt: string | null,
): Promise<void> {
  if (!uid) {
    throw new Error('You must be logged in.');
  }

  if (!Number.isInteger(order) || order < 1 || order > 3) {
    throw new Error('Invalid photo slot.');
  }

  const { data, error } = await supabase.rpc(
    'save_my_photo_prompt',
    {
      p_order: order,
      p_prompt: prompt?.trim() || null,
    },
  );

  if (error) {
    console.error('updatePhotoPrompt error:', error);
    throw new Error(error.message || 'Could not save your photo prompt.');
  }

  if (data !== true) {
    throw new Error('The photo prompt was not saved. Please retry.');
  }
}

/**
 * Uploads the new image, replaces the existing photo record using
 * your existing replace_photo RPC, and then saves its prompt.
 */
export async function savePhoto(
  uid: string,
  order: number,
  blob: Blob,
  prompt: string | null = null,
): Promise<void> {
  if (!uid) {
    throw new Error('You must be logged in.');
  }

  if (!Number.isInteger(order) || order < 1 || order > 3) {
    throw new Error('Invalid photo slot.');
  }

  const path = `${uid}/${crypto.randomUUID()}.webp`;

  const upload = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, {
      contentType: 'image/webp',
      upsert: false,
    });

  if (upload.error) {
    console.error('Photo upload error:', upload.error);

    throw new Error(
      upload.error.message.toLowerCase().includes('quota')
        ? 'Storage is full. Contact support.'
        : 'Photo upload failed. Check your connection and retry.',
    );
  }

  let oldPath: string | null = null;
  let replacementSucceeded = false;

  try {
    const { data, error } = await supabase.rpc('replace_photo', {
      p_order: order,
      p_path: path,
    });

    if (error) {
      console.error('replace_photo error:', error);
      throw new Error(error.message || 'Could not replace the photo.');
    }

    oldPath = typeof data === 'string' ? data : null;
    replacementSucceeded = true;

    // Persist the prompt after the photo record has been replaced.
    await updatePhotoPrompt(uid, order, prompt);
  } catch (error) {
    // If the replacement did not happen, remove the newly uploaded file.
    if (!replacementSucceeded) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    }

    throw error;
  } finally {
    // The old image is no longer needed after a successful replacement.
    if (replacementSucceeded && oldPath) {
      const { error: removeError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([oldPath]);

      if (removeError) {
        console.error('Could not remove old photo file:', removeError);
      }
    }
  }
}

export async function removePhoto(photo: Photo): Promise<void> {
  const { error } = await supabase
    .from('profile_photos')
    .delete()
    .eq('id', photo.id);

  if (error) {
    console.error('removePhoto database error:', error);
    throw new Error('Could not remove the photo.');
  }

  const { error: storageError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([photo.storage_path]);

  if (storageError) {
    console.error('removePhoto storage error:', storageError);
    // The database row is already deleted; do not report that deletion failed.
  }
}
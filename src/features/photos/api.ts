
import { supabase } from '../../lib/supabase';

// ======================================================
// PHOTO TYPES
// ======================================================

export type Photo = {
  id: string;
  storage_path: string;
  display_order: number;
  prompt: string | null;
  url: string;
};

const PHOTO_BUCKET = 'profile-photos';
const SIGNED_URL_EXPIRY = 3600;

// ======================================================
// ERROR HANDLING
// ======================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function validateUser(uid: string): void {
  if (!uid?.trim()) {
    throw new Error(
      'You must be logged in to manage photos.'
    );
  }
}

function validateOrder(order: number): void {
  if (
    !Number.isInteger(order) ||
    order < 1 ||
    order > 3
  ) {
    throw new Error(
      'Invalid photo slot. Select a slot between 1 and 3.'
    );
  }
}

// ======================================================
// LIST MY PHOTOS
// ======================================================

/**
 * Retrieves the authenticated user's photo records
 * and generates temporary signed URLs.
 *
 * Uses the existing profile_photos table and
 * profile-photos private storage bucket.
 */
export async function listMyPhotos(
  uid: string
): Promise<Photo[]> {
  validateUser(uid);

  // STEP 1: Retrieve photo records from Supabase.

  const { data, error } = await supabase
    .from('profile_photos')
    .select(
      'id, storage_path, display_order, prompt'
    )
    .eq('user_id', uid)
    .order('display_order', {
      ascending: true,
    });

  if (error) {
    console.error('PHOTO DATABASE ERROR:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    throw new Error(
      `Could not load photos: ${error.message}`
    );
  }

  // No saved photos is a valid state.

  if (!data || data.length === 0) {
    return [];
  }

  // STEP 2: Validate storage paths.

  const paths = data.map(
    photo => photo.storage_path
  );

  if (
    paths.some(
      path =>
        typeof path !== 'string' ||
        path.trim().length === 0
    )
  ) {
    console.error(
      'PHOTO ERROR: Missing storage path.',
      data
    );

    throw new Error(
      'One or more photos have missing storage paths.'
    );
  }

  // STEP 3: Generate signed URLs.

  const {
    data: signed,
    error: signedError,
  } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(
      paths,
      SIGNED_URL_EXPIRY
    );

  if (signedError) {
    console.error('PHOTO STORAGE ERROR:', {
      message: signedError.message,
      name: signedError.name,
    });

    throw new Error(
      `Could not generate photo previews: ${signedError.message}`
    );
  }

  if (!signed || signed.length !== data.length) {
    console.error(
      'PHOTO ERROR: Signed URL count mismatch.',
      {
        photos: data.length,
        signedUrls: signed?.length ?? 0,
      }
    );

    throw new Error(
      'Could not generate all photo preview URLs.'
    );
  }

  // STEP 4: Validate every individual signed URL.

  const photos: Photo[] = data.map(
    (photo, index) => {
      const signedResult = signed[index];

      if (
        !signedResult ||
        signedResult.error ||
        !signedResult.signedUrl
      ) {
        console.error(
          'INDIVIDUAL PHOTO URL ERROR:',
          {
            photoId: photo.id,
            path: photo.storage_path,
            error: signedResult?.error,
          }
        );

        throw new Error(
          `Could not load photo ${photo.display_order}: ${
            signedResult?.error ||
            'Signed URL is missing.'
          }`
        );
      }

      return {
        id: photo.id,
        storage_path: photo.storage_path,
        display_order: photo.display_order,
        prompt: photo.prompt ?? null,
        url: signedResult.signedUrl,
      };
    }
  );

  return photos;
}

// ======================================================
// UPDATE PHOTO PROMPT
// ======================================================

/**
 * Saves a prompt against the authenticated user's
 * selected photo slot.
 *
 * Uses the existing save_my_photo_prompt RPC.
 */
export async function updatePhotoPrompt(
  uid: string,
  order: number,
  prompt: string | null
): Promise<void> {
  validateUser(uid);
  validateOrder(order);

  const cleanedPrompt =
    prompt?.trim() || null;

  const { data, error } = await supabase.rpc(
    'save_my_photo_prompt',
    {
      p_order: order,
      p_prompt: cleanedPrompt,
    }
  );

  if (error) {
    console.error(
      'UPDATE PHOTO PROMPT ERROR:',
      {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }
    );

    throw new Error(
      `Could not save photo prompt: ${error.message}`
    );
  }

  if (data !== true) {
    throw new Error(
      'The photo prompt was not saved. Please retry.'
    );
  }
}

// ======================================================
// SAVE / REPLACE PHOTO
// ======================================================

/**
 * Uploads an optimized WebP image.
 *
 * Uses the existing replace_photo RPC to replace
 * the selected photo slot.
 *
 * Preserves the existing photo prompt.
 */
export async function savePhoto(
  uid: string,
  order: number,
  blob: Blob,
  prompt: string | null = null
): Promise<void> {
  validateUser(uid);
  validateOrder(order);

  if (
    !blob ||
    blob.size === 0 ||
    blob.type !== 'image/webp'
  ) {
    throw new Error(
      'Invalid processed image. Please select another photo.'
    );
  }

  // STEP 1: Generate a unique storage path.

  const path =
    `${uid}/${crypto.randomUUID()}.webp`;

  // STEP 2: Upload the new image.

  const upload = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, {
      contentType: 'image/webp',
      upsert: false,
    });

  if (upload.error) {
    console.error('PHOTO UPLOAD ERROR:', {
      message: upload.error.message,
      name: upload.error.name,
    });

    const message =
      upload.error.message.toLowerCase();

    if (
      message.includes('quota') ||
      message.includes('storage limit')
    ) {
      throw new Error(
        'Storage is full. Please contact support.'
      );
    }

    throw new Error(
      `Photo upload failed: ${upload.error.message}`
    );
  }

  let oldPath: string | null = null;
  let replacementSucceeded = false;

  try {
    // STEP 3: Replace the selected photo slot.

    const {
      data,
      error,
    } = await supabase.rpc(
      'replace_photo',
      {
        p_order: order,
        p_path: path,
      }
    );

    if (error) {
      console.error(
        'REPLACE PHOTO RPC ERROR:',
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        }
      );

      throw new Error(
        `Could not replace photo: ${error.message}`
      );
    }

    oldPath =
      typeof data === 'string'
        ? data
        : null;

    replacementSucceeded = true;

    // STEP 4: Save the selected prompt.

    await updatePhotoPrompt(
      uid,
      order,
      prompt
    );

  } catch (error) {

    // STEP 5: Clean up the new upload only
    // if the replacement did not succeed.

    if (!replacementSucceeded) {
      const { error: cleanupError } =
        await supabase.storage
          .from(PHOTO_BUCKET)
          .remove([path]);

      if (cleanupError) {
        console.error(
          'NEW PHOTO CLEANUP ERROR:',
          cleanupError
        );
      }
    }

    throw error;

  } finally {

    // STEP 6: Remove the old image after
    // successful replacement.

    if (
      replacementSucceeded &&
      oldPath &&
      oldPath !== path
    ) {
      const {
        error: removeError,
      } = await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([oldPath]);

      if (removeError) {
        console.error(
          'OLD PHOTO CLEANUP ERROR:',
          removeError
        );
      }
    }
  }
}

// ======================================================
// REMOVE PHOTO
// ======================================================

/**
 * Removes the selected photo record and its
 * corresponding storage object.
 */
export async function removePhoto(
  photo: Photo
): Promise<void> {
  if (!photo?.id || !photo.storage_path) {
    throw new Error(
      'Invalid photo record.'
    );
  }

  // STEP 1: Delete the database record.

  const { error } = await supabase
    .from('profile_photos')
    .delete()
    .eq('id', photo.id);

  if (error) {
    console.error(
      'REMOVE PHOTO DATABASE ERROR:',
      {
        message: error.message,
        code: error.code,
        details: error.details,
      }
    );

    throw new Error(
      `Could not remove photo: ${error.message}`
    );
  }

  // STEP 2: Remove the corresponding storage object.

  const {
    error: storageError,
  } = await supabase.storage
    .from(PHOTO_BUCKET)
    .remove([photo.storage_path]);

  if (storageError) {
    // The database record has already been deleted.
    // Do not pretend that the database deletion failed.

    console.error(
      'REMOVE PHOTO STORAGE ERROR:',
      {
        path: photo.storage_path,
        message: storageError.message,
      }
    );
  }
}

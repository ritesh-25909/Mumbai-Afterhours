
import { supabase } from '../../lib/supabase';
import { POLICY_VERSION } from '../../lib/constants';

export type VStatus = 'pending' | 'approved' | 'rejected' | 'retry';

export type SelfieAngle = 'front' | 'left' | 'right';

export type SelfieFiles = Record<SelfieAngle, Blob>;

export type VRequest = {
  id: string;
  status: VStatus;
  submitted_at: string;
  rejection_reason_code: string | null;
};

export const REASONS: Record<string, string> = {
  face_not_visible: 'Your face was not clearly visible.',
  photos_dont_match: 'The selfies did not match your profile photos.',
  unclear_image: 'One or more images were too dark or blurry.',
  other: 'Your verification could not be approved.',
};

/**
 * Fetch the latest verification request for a user.
 */
export async function getLatestRequest(
  uid: string,
): Promise<VRequest | null> {
  if (!uid) {
    throw new Error('User ID is missing.');
  }

  const { data, error } = await supabase
    .from('verification_requests')
    .select('id,status,submitted_at,rejection_reason_code')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getLatestRequest failed:', error);

    throw new Error(
      `Could not load your verification status: ${error.message}`,
    );
  }

  return data as VRequest | null;
}

/**
 * Upload three separately captured selfie angles.
 *
 * Files are uploaded to the private verification bucket.
 * The database request is created only after all uploads succeed.
 * Failed submissions trigger cleanup of uploaded files.
 */
export async function submitSelfies(
  uid: string,
  files: SelfieFiles,
): Promise<void> {
  if (!uid) {
    throw new Error('User ID is missing.');
  }

  const angles: SelfieAngle[] = [
    'front',
    'left',
    'right',
  ];

  const paths: Record<SelfieAngle, string> = {
    front: `${uid}/${crypto.randomUUID()}-front.jpg`,
    left: `${uid}/${crypto.randomUUID()}-left.jpg`,
    right: `${uid}/${crypto.randomUUID()}-right.jpg`,
  };

  const uploadedPaths: string[] = [];

  try {
    for (const angle of angles) {
      const file = files[angle];

      if (!file || file.size === 0) {
        throw new Error(`The ${angle} selfie is missing.`);
      }

      const upload = await supabase.storage
        .from('verification-selfies')
        .upload(paths[angle], file, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (upload.error) {
        throw new Error(
          `Could not upload your ${angle} selfie: ${upload.error.message}`,
        );
      }

      uploadedPaths.push(paths[angle]);
    }

    const { error } = await supabase.rpc('submit_verification', {
      p_front_path: paths.front,
      p_left_path: paths.left,
      p_right_path: paths.right,
      p_consent: true,
      p_policy_version: POLICY_VERSION,
    });

    if (error) {
      throw new Error(
        `Could not submit verification: ${error.message}`,
      );
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const cleanup = await supabase.storage
        .from('verification-selfies')
        .remove(uploadedPaths);

      if (cleanup.error) {
        console.error(
          'Verification upload cleanup failed:',
          cleanup.error.message,
        );
      }
    }

    throw error;
  }
}

export type Pending = {
  request_id: string;
  user_id: string;
  display_name: string;
  submitted_at: string;
  selfie_front_path: string;
  selfie_left_path: string;
  selfie_right_path: string;
  photo_paths: string[];
};

/**
 * Fetch pending verification requests for moderators.
 */
export const listPending = async (): Promise<Pending[]> => {
  const { data, error } = await supabase.rpc(
    'list_pending_verifications',
  );

  if (error) {
    console.error('listPending failed:', error);
    throw new Error(
      `Could not load pending verifications: ${error.message}`,
    );
  }

  return (data as Pending[]) ?? [];
};

/**
 * Records a moderator's decision and deletes the three
 * private selfies after the decision has been saved.
 *
 * The SQL function returns paths as newline-separated text.
 */
export async function review(
  id: string,
  decision: 'approved' | 'rejected' | 'retry',
  reason?: string,
): Promise<boolean> {
  if (!id) {
    throw new Error('Verification request ID is missing.');
  }

  const { data, error } = await supabase.rpc(
    'review_verification',
    {
      p_request: id,
      p_decision: decision,
      p_reason: reason ?? null,
    },
  );

  if (error) {
    console.error('review_verification failed:', error);
    throw new Error(
      `Could not save the moderation decision: ${error.message}`,
    );
  }

  // The SQL function returns a single text string,
  // not a string array.
  const rawPaths =
    typeof data === 'string' ? data : '';

  const paths = rawPaths
    .split(/\r?\n/)
    .map(path => path.trim())
    .filter(Boolean);

  if (
    paths.length !== 3 ||
    paths.some(path => !path)
  ) {
    console.error(
      'The moderation decision was saved, but the three selfie paths were not returned correctly.',
      data,
    );

    return false;
  }

  // Only delete files belonging to the reviewed request's user.
  const expectedPrefix = `${paths[0].split('/')[0]}/`;

  if (
    !paths.every(path => path.startsWith(expectedPrefix)) ||
    paths.some(path => path.split('/').length !== 2)
  ) {
    console.error(
      'Invalid verification selfie paths returned by the database.',
    );

    return false;
  }

  const deletion = await supabase.storage
    .from('verification-selfies')
    .remove(paths);

  if (deletion.error) {
    console.error(
      'Moderation decision saved, but selfie deletion failed:',
      deletion.error.message,
    );

    return false;
  }

  return true;
}

/**
 * Retrieve the current user's application roles.
 */
export async function myRoles(): Promise<string[]> {
  const { data, error } = await supabase.rpc('my_roles');

  if (error) {
    console.error('MY ROLES RPC ERROR:', error);

    throw new Error(
      error.message || 'Could not verify account permissions.',
    );
  }

  return (data as string[]) ?? [];
}

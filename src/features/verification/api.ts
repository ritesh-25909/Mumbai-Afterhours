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

export async function getLatestRequest(
  uid: string,
): Promise<VRequest | null> {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('id,status,submitted_at,rejection_reason_code')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Could not load your verification status.');
  }

  return data as VRequest | null;
}

/**
 * Uploads three separately captured selfie angles.
 *
 * All three files are uploaded to the private verification bucket.
 * The database submission is created only after all uploads succeed.
 * Any uploaded files are removed if a later step fails.
 */
export async function submitSelfies(
  uid: string,
  files: SelfieFiles,
): Promise<void> {
  if (!uid) {
    throw new Error('User ID is missing.');
  }

  const angles: SelfieAngle[] = ['front', 'left', 'right'];

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
          `Could not upload your ${angle} selfie. Check your connection and try again.`,
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
      throw new Error(error.message);
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const cleanup = await supabase.storage
        .from('verification-selfies')
        .remove(uploadedPaths);

      if (cleanup.error) {
        console.error(
          'Could not clean up incomplete verification uploads:',
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

export const listPending = async (): Promise<Pending[]> => {
  const { data, error } = await supabase.rpc(
    'list_pending_verifications',
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data as Pending[]) ?? [];
};

/**
 * Records the moderator's decision and removes all three private selfies.
 */
export async function review(
  id: string,
  decision: 'approved' | 'rejected' | 'retry',
  reason?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    'review_verification',
    {
      p_request: id,
      p_decision: decision,
      p_reason: reason ?? null,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const paths = (data as string[] | null) ?? [];

  if (paths.length !== 3 || paths.some(path => !path)) {
    console.error(
      'Verification decision was saved, but three valid selfie paths were not returned.',
    );
    return false;
  }

  const deletion = await supabase.storage
    .from('verification-selfies')
    .remove(paths);

  return !deletion.error;
}

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

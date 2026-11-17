
import { supabase } from '../../lib/supabase';

// ==========================================
// TYPES
// ==========================================

export type ProfilePromptAnswer = {
  prompt: string;
  answer: string;
};

export type Candidate = {
  id: string;
  display_name: string;
  age: number;
  neighbourhood: string | null;
  bio: string | null;
  interests: string[];
  languages: string[];
  relationship_intention: string | null;
  verified: boolean;

  college: string | null;
  education_status: string | null;

  height: string | null;
  occupation: string | null;
  smoking: string | null;
  alcohol: string | null;
  religion: string | null;

  photo_paths: string[];
  photo_prompts: (string | null)[];
  photoUrls: string[];

  profile_prompts: ProfilePromptAnswer[];
};

export type MatchedProfilePhoto = {
  storage_path: string;
  display_order: number;
  prompt: string | null;
  photoUrl: string;
};

export type MatchedProfile = {
  id: string;
  display_name: string;
  date_of_birth: string;
  gender: string | null;
  city: string | null;
  neighbourhood: string | null;
  bio: string | null;
  languages: string[];
  interests: string[];
  relationship_intention: string | null;
  verified: boolean;
  college: string | null;
  education_status: string | null;
  height: string | null;
  occupation: string | null;
  profile_prompts: Record<string, unknown> | null;
  photos: MatchedProfilePhoto[];
};

// ==========================================
// CONFIGURATION
// ==========================================

const PHOTO_BUCKET = 'profile-photos';

const PHOTO_CACHE_DURATION = 50 * 60 * 1000;

const SIGNED_URL_EXPIRY = 3600;

// ==========================================
// PHOTO CACHE
// ==========================================

type CachedPhotoUrl = {
  url: string;
  expiresAt: number;
};

const photoUrlCache = new Map<string, CachedPhotoUrl>();

const pendingPhotoRequests = new Map<
  string,
  Promise<string | null>
>();

// ==========================================
// CACHE MANAGEMENT
// ==========================================

export function clearPhotoUrlCache(): void {
  photoUrlCache.clear();
  pendingPhotoRequests.clear();
}

function getCachedPhotoUrl(
  path: string
): string | null {
  const cached = photoUrlCache.get(path);

  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    photoUrlCache.delete(path);
    return null;
  }

  return cached.url;
}

// ==========================================
// PROFILE PROMPT NORMALIZER
// ==========================================

function normalizeProfilePrompts(
  value: unknown
): ProfilePromptAnswer[] {
  let parsed = value;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(
    (item): item is ProfilePromptAnswer =>
      item !== null &&
      typeof item === 'object' &&
      typeof item.prompt === 'string' &&
      typeof item.answer === 'string' &&
      item.prompt.trim().length > 0 &&
      item.answer.trim().length > 0
  );
}

// ==========================================
// ARRAY NORMALIZERS
// ==========================================

function normalizeStringArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === 'string' &&
      item.trim().length > 0
  );
}

function normalizePhotoPrompts(
  value: unknown
): (string | null)[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(item =>
    typeof item === 'string' && item.trim()
      ? item
      : null
  );
}

// ==========================================
// SIGN PHOTO PATHS
// ==========================================

/**
 * Generates signed URLs for private profile photos.
 *
 * Improvements:
 * - Maps signed URLs using the original requested paths.
 * - Does not depend on Supabase returning an identical path.
 * - Uses cached URLs where available.
 * - Prevents duplicate concurrent requests.
 * - Handles individual photo failures.
 * - Does not cache failed URLs.
 */

export async function signPhotoPaths(
  paths: string[]
): Promise<Record<string, string>> {

  const uniquePaths = [
    ...new Set(
      paths.filter(
        (path): path is string =>
          typeof path === 'string' &&
          path.trim().length > 0
      ).map(path => path.trim())
    ),
  ];

  if (uniquePaths.length === 0) {
    return {};
  }

  const result: Record<string, string> = {};

  const missingPaths: string[] = [];

  // STEP 1: Use valid cached URLs.

  for (const path of uniquePaths) {
    const cached = getCachedPhotoUrl(path);

    if (cached) {
      result[path] = cached;
    } else {
      missingPaths.push(path);
    }
  }

  if (missingPaths.length === 0) {
    return result;
  }

  // STEP 2: Identify paths that need a new request.

  const newPaths = missingPaths.filter(
    path => !pendingPhotoRequests.has(path)
  );

  // STEP 3: Generate signed URLs in one batch.

  if (newPaths.length > 0) {

    const batchRequest = (async () => {

      const {
        data,
        error,
      } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(
          newPaths,
          SIGNED_URL_EXPIRY
        );

      if (error) {
        console.error(
          'DISCOVER PHOTO SIGNING ERROR:',
          {
            message: error.message,
            name: error.name,
          }
        );

        throw new Error(
          `Could not generate photo URLs: ${error.message}`
        );
      }

      const urls: Record<string, string> = {};

      // IMPORTANT:
      // Map by the original request index.
      // Do not rely exclusively on returned item.path.

      newPaths.forEach((originalPath, index) => {

        const item = data?.[index];

        if (
          !item ||
          item.error ||
          !item.signedUrl
        ) {
          console.error(
            'INDIVIDUAL PHOTO SIGNING ERROR:',
            {
              originalPath,
              returnedPath: item?.path,
              error: item?.error,
            }
          );

          return;
        }

        urls[originalPath] = item.signedUrl;

        // Cache only successful URLs.

        photoUrlCache.set(originalPath, {
          url: item.signedUrl,
          expiresAt:
            Date.now() + PHOTO_CACHE_DURATION,
        });

      });

      return urls;

    })();

    // STEP 4: Register individual pending requests.

    for (const path of newPaths) {

      let pending!: Promise<string | null>;

      pending = batchRequest
        .then(urls => urls[path] ?? null)
        .catch(error => {
          console.error(
            'PHOTO URL REQUEST FAILED:',
            {
              path,
              error,
            }
          );

          return null;
        })
        .finally(() => {
          // Avoid deleting a newer pending request.
          if (pendingPhotoRequests.get(path) === pending) {
            pendingPhotoRequests.delete(path);
          }
        });

      pendingPhotoRequests.set(path, pending);
    }
  }

  // STEP 5: Wait for all requested paths,
  // including requests already running elsewhere.

  const pendingResults = await Promise.all(
    missingPaths.map(async path => {

      const cached = getCachedPhotoUrl(path);

      if (cached) {
        return [path, cached] as const;
      }

      const pending = pendingPhotoRequests.get(path);

      if (!pending) {
        return [path, null] as const;
      }

      const url = await pending;

      return [path, url] as const;
    })
  );

  // STEP 6: Return only valid URLs.

  for (const [path, url] of pendingResults) {
    if (url) {
      result[path] = url;
    }
  }

  return result;
}

// ==========================================
// DISCOVER PROFILES
// ==========================================

type CandidateRow = Omit<
  Candidate,
  'photoUrls' | 'profile_prompts'
> & {
  photo_paths: string[] | null;
  photo_prompts: (string | null)[] | null;
  profile_prompts: unknown;
};

/**
 * Retrieves Discover candidates and their private photos.
 *
 * Existing RPC functions are preserved.
 */

export async function fetchCandidates(
  isAdmin = false
): Promise<Candidate[]> {

  // STEP 1: Fetch candidate profiles.

  const { data, error } = isAdmin
    ? await supabase.rpc(
        'admin_discover_all_profiles',
        {
          page_size: 10,
          page_offset: 0,
        }
      )
    : await supabase.rpc(
        'discover_profiles',
        {
          page_size: 10,
          page_offset: 0,
        }
      );

  if (error) {
    console.error(
      'DISCOVER PROFILES ERROR:',
      {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }
    );

    throw new Error(
      `Could not load profiles: ${error.message}`
    );
  }

  const rows = (data ?? []) as CandidateRow[];

  if (rows.length === 0) {
    return [];
  }

  // STEP 2: Collect all photo paths.

  const allPhotoPaths = rows.flatMap(row =>
    normalizeStringArray(row.photo_paths)
  );

  // STEP 3: Generate signed URLs.

  const urls = await signPhotoPaths(allPhotoPaths);

  // STEP 4: Attach photos to their respective profiles.

  const candidates: Candidate[] = rows.map(row => {

    const paths = normalizeStringArray(
      row.photo_paths
    );

    const prompts = normalizePhotoPrompts(
      row.photo_prompts
    );

    // Keep photo paths, prompts and URLs aligned.
    // Never shift a prompt onto another photo.

    const availablePhotos = paths
      .map((path, index) => ({
        path,
        prompt: prompts[index] ?? null,
        url: urls[path] ?? '',
      }))
      .filter(photo => photo.url.length > 0);

    return {
      ...row,

      photo_paths: availablePhotos.map(
        photo => photo.path
      ),

      photo_prompts: availablePhotos.map(
        photo => photo.prompt
      ),

      photoUrls: availablePhotos.map(
        photo => photo.url
      ),

      profile_prompts: normalizeProfilePrompts(
        row.profile_prompts
      ),

      interests: normalizeStringArray(
        row.interests
      ),

      languages: normalizeStringArray(
        row.languages
      ),
    };
  });

  return candidates;
}

// ==========================================
// LIKE USER
// ==========================================

export async function likeUser(
  id: string,
  comment = ''
): Promise<{
  matched: boolean;
  match_id: string | null;
}> {

  const { data, error } = await supabase.rpc(
    'send_like',
    {
      target: id,
      message: comment.trim() || null,
    }
  );

  if (error) {
    throw new Error(
      error.message === 'Unavailable.'
        ? 'This profile is no longer available.'
        : error.message
    );
  }

  return data as {
    matched: boolean;
    match_id: string | null;
  };
}

// ==========================================
// PASS USER
// ==========================================

export async function passUser(
  id: string
): Promise<void> {

  const { error } = await supabase.rpc(
    'pass_user',
    {
      target: id,
    }
  );

  if (error) {
    console.error('PASS USER ERROR:', error);

    throw new Error(
      'Could not record that. Try again.'
    );
  }
}

// ==========================================
// BLOCK USER
// ==========================================

export async function blockUser(
  id: string
): Promise<void> {

  const { error } = await supabase.rpc(
    'block_user',
    {
      target: id,
    }
  );

  if (error) {
    console.error('BLOCK USER ERROR:', error);

    throw new Error(
      'Could not block this person. Try again.'
    );
  }
}

// ==========================================
// REPORT CATEGORIES
// ==========================================

export const REPORT_CATEGORIES: Record<string, string> = {
  fake_profile: 'Fake profile',
  impersonation: 'Impersonation',
  harassment: 'Harassment',
  inappropriate_content: 'Inappropriate content',
  spam_scam: 'Spam or scam',
  suspected_underage: 'Suspected underage user',
  other: 'Other safety concern',
};

// ==========================================
// REPORT USER
// ==========================================

export async function reportUser(
  reporter: string,
  reported: string,
  category: string,
  description: string
): Promise<void> {

  const { error } = await supabase
    .from('user_reports')
    .insert({
      reporter_user_id: reporter,
      reported_user_id: reported,
      category,
      description: description || null,
    });

  if (error) {
    console.error('REPORT USER ERROR:', error);

    throw new Error(
      'Could not send your report. Try again.'
    );
  }
}

// ==========================================
// MATCHED USER PROFILE VIEWER
// ==========================================

export async function fetchMatchedProfile(
  userId: string
): Promise<MatchedProfile> {

  if (!userId) {
    throw new Error('Invalid profile.');
  }

  // STEP 1: Fetch matched profile.

  const {
    data,
    error,
  } = await supabase.rpc(
    'get_profile_for_view',
    {
      target_user_id: userId,
    }
  );

  if (error || !data) {
    console.error(
      'MATCHED PROFILE ERROR:',
      error
    );

    throw new Error(
      error?.message ||
      'Could not load this profile.'
    );
  }

  const row = data as Omit<
    MatchedProfile,
    'photos'
  > & {
    photos?: Omit<
      MatchedProfilePhoto,
      'photoUrl'
    >[];
  };

  // STEP 2: Collect matched profile photo paths.

  const photos = row.photos ?? [];

  // STEP 3: Generate signed URLs.

  const urls = await signPhotoPaths(
    photos.map(photo => photo.storage_path)
  );

  // STEP 4: Return photos with signed URLs.

  return {
    ...row,

    photos: photos
      .filter(photo =>
        Boolean(urls[photo.storage_path])
      )
      .map(photo => ({
        ...photo,
        photoUrl: urls[photo.storage_path],
      })),
  };
}

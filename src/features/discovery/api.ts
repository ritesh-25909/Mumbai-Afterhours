
import { supabase } from '../../lib/supabase';

// ==========================================
// PHOTO CACHE
// ==========================================

const PHOTO_CACHE_DURATION = 55 * 60 * 1000;

const photoUrlCache = new Map<
  string,
  {
    url: string;
    expiresAt: number;
  }
>();

const pendingPhotoRequests = new Map<
  string,
  Promise<string | null>
>();

// ==========================================
// TYPES
// ==========================================

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

  // Education
  college: string | null;
  education_status: string | null;

  // Additional profile details
  height: string | null;
  occupation: string | null;
  smoking: string | null;
  alcohol: string | null;
  religion: string | null;

  // Photos and associated prompts
  photo_paths: string[];
  photo_prompts: (string | null)[];
  photoUrls: string[];
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
// SIGN PROFILE PHOTOS - OPTIMIZED
// ==========================================

export async function signPhotoPaths(
  paths: string[]
): Promise<Record<string, string>> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];

  if (!uniquePaths.length) {
    return {};
  }

  const result: Record<string, string> = {};
  const missingPaths: string[] = [];
  const now = Date.now();

  // STEP 1: Cached URLs

  for (const path of uniquePaths) {
    const cached = photoUrlCache.get(path);

    if (cached && cached.expiresAt > now) {
      result[path] = cached.url;
    } else {
      photoUrlCache.delete(path);
      missingPaths.push(path);
    }
  }

  if (!missingPaths.length) {
    return result;
  }

  // STEP 2: Fetch missing URLs

  const pathsToFetch = missingPaths.filter(
    path => !pendingPhotoRequests.has(path)
  );

  let batchRequest: Promise<Record<string, string>> | null = null;

  if (pathsToFetch.length > 0) {
    batchRequest = (async () => {
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .createSignedUrls(pathsToFetch, 3600);

      if (error) {
        throw new Error('Could not load photos.');
      }

      const urls: Record<string, string> = {};

      data?.forEach(item => {
        if (item.path && item.signedUrl) {
          urls[item.path] = item.signedUrl;

          photoUrlCache.set(item.path, {
            url: item.signedUrl,
            expiresAt: Date.now() + PHOTO_CACHE_DURATION
          });
        }
      });

      return urls;
    })();

    pathsToFetch.forEach(path => {
      const pending = batchRequest!.then(
        urls => urls[path] ?? null
      );

      pendingPhotoRequests.set(path, pending);
    });

    try {
      await batchRequest;
    } finally {
      pathsToFetch.forEach(path => {
        pendingPhotoRequests.delete(path);
      });
    }
  }

  // STEP 3: Resolve pending requests

  const pendingResults = await Promise.all(
    missingPaths.map(async path => {
      const cached = photoUrlCache.get(path);

      if (cached && cached.expiresAt > Date.now()) {
        return [path, cached.url] as const;
      }

      const pending = pendingPhotoRequests.get(path);

      if (pending) {
        return [path, await pending] as const;
      }

      return [path, null] as const;
    })
  );

  pendingResults.forEach(([path, url]) => {
    if (url) {
      result[path] = url;
    }
  });

  return result;
}

// ==========================================
// DISCOVER PROFILES
// ==========================================

export async function fetchCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase.rpc(
    'discover_profiles',
    {
      page_size: 10,
      page_offset: 0
    }
  );

  if (error) {
    throw new Error(
      'Could not load profiles. Check your connection and try again.'
    );
  }

  const rows = (data ?? []) as Omit<Candidate, 'photoUrls'>[];

  const urls = await signPhotoPaths(
    rows.flatMap(row => row.photo_paths ?? [])
  );

  return rows.map(row => {
    const paths = row.photo_paths ?? [];
    const prompts = row.photo_prompts ?? [];

    // Keep every prompt attached to its correct image.
    const availablePhotos = paths
      .map((path, index) => ({
        path,
        prompt: prompts[index] ?? null,
        url: urls[path]
      }))
      .filter(
        (photo): photo is {
          path: string;
          prompt: string | null;
          url: string;
        } => Boolean(photo.url)
      );

    return {
      ...row,
      photo_paths: availablePhotos.map(photo => photo.path),
      photo_prompts: availablePhotos.map(photo => photo.prompt),
      photoUrls: availablePhotos.map(photo => photo.url),
      interests: row.interests ?? [],
      languages: row.languages ?? []
    };
  });
}

// ==========================================
// LIKE USER
// ==========================================

export async function likeUser(
  id: string
): Promise<{ matched: boolean; match_id: string | null }> {
  const { data, error } = await supabase.rpc(
    'like_user',
    { target: id }
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

export async function passUser(id: string) {
  const { error } = await supabase.rpc(
    'pass_user',
    { target: id }
  );

  if (error) {
    throw new Error('Could not record that. Try again.');
  }
}

// ==========================================
// BLOCK USER
// ==========================================

export async function blockUser(id: string) {
  const { error } = await supabase.rpc(
    'block_user',
    { target: id }
  );

  if (error) {
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
  other: 'Other safety concern'
};

// ==========================================
// REPORT USER
// ==========================================

export async function reportUser(
  reporter: string,
  reported: string,
  category: string,
  description: string
) {
  const { error } = await supabase
    .from('user_reports')
    .insert({
      reporter_user_id: reporter,
      reported_user_id: reported,
      category,
      description: description || null
    });

  if (error) {
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

  const { data, error } = await supabase.rpc(
    'get_matched_profile',
    {
      target_user_id: userId
    }
  );

  if (error || !data) {
    throw new Error(
      error?.message || 'Could not load this profile.'
    );
  }

  const row = data as Omit<MatchedProfile, 'photos'> & {
    photos?: Omit<MatchedProfilePhoto, 'photoUrl'>[];
  };

  const photos = row.photos ?? [];

  const urls = await signPhotoPaths(
    photos.map(photo => photo.storage_path)
  );

  return {
    ...row,
    photos: photos
      .filter(photo => Boolean(urls[photo.storage_path]))
      .map(photo => ({
        ...photo,
        photoUrl: urls[photo.storage_path]
      }))
  };
}

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(Deno.env.get('ALLOWED_ORIGIN') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

const BUCKETS = ['profile-photos', 'verification-selfies'] as const;

function corsHeaders(origin: string | null) {
  return {
    ...(origin && allowedOrigins.has(origin)
      ? { 'Access-Control-Allow-Origin': origin }
      : {}),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Recursively list objects beneath a user's UUID folder.
 * Storage list entries with no id are folders; actual objects have an id.
 */
async function listUserStorageObjects(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const found: string[] = [];
  const folders = [prefix];

  while (folders.length) {
    const folder = folders.pop()!;
    let offset = 0;

    while (true) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(folder, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });

      if (error) throw new Error(`Could not inspect ${bucket} storage: ${error.message}`);

      const entries = data ?? [];
      for (const entry of entries) {
        const fullPath = `${folder}/${entry.name}`;
        if (entry.id) found.push(fullPath);
        else folders.push(fullPath);
      }

      if (entries.length < 100) break;
      offset += entries.length;
    }
  }

  return found;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    if (origin && !allowedOrigins.has(origin)) {
      return json({ error: 'Origin not allowed.' }, 403, origin);
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (origin && !allowedOrigins.has(origin)) {
    return json({ error: 'Origin not allowed.' }, 403, origin);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, origin);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('Missing required Supabase Edge Function environment variables.');
    return json({ error: 'Account deletion service is not configured.' }, 500, origin);
  }

  try {
    const authorization = req.headers.get('Authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: 'Authentication token missing.' }, 401, origin);

    // Caller-scoped client: verifies identity and Super Admin role using the
    // caller's JWT, never the service-role client.
    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await caller.auth.getUser(token);
    const actor = authData.user;
    if (authError || !actor) {
      return json({ error: 'Invalid or expired admin session.' }, 401, origin);
    }

    const { data: isSuperAdmin, error: roleError } = await caller.rpc(
      'has_role',
      { r: 'super_admin' },
    );
    if (roleError) {
      console.error('SUPER ADMIN CHECK FAILED:', roleError);
      return json({ error: 'Could not verify Super Admin permissions.' }, 403, origin);
    }
    if (isSuperAdmin !== true) {
      return json({ error: 'Only a Super Admin can permanently delete member accounts.' }, 403, origin);
    }

    const body = await req.json().catch(() => null);
    const targetUserId = body?.target_user_id;
    if (body?.confirm !== 'DELETE' || !isUuid(targetUserId)) {
      return json({ error: 'A valid target_user_id and DELETE confirmation are required.' }, 400, origin);
    }

    if (targetUserId === actor.id) {
      return json({ error: 'You cannot delete your own account from the Admin Command Center.' }, 400, origin);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify the target exists and is not a staff account. Staff role deletion
    // is intentionally blocked here to prevent accidental loss of admin access,
    // including deletion of the last Super Admin.
    const { data: targetProfile, error: profileError } = await admin
      .from('profiles')
      .select('id, display_name, deleted_at')
      .eq('id', targetUserId)
      .maybeSingle();

    if (profileError) {
      console.error('TARGET PROFILE LOOKUP FAILED:', profileError);
      return json({ error: 'Could not verify the selected member.' }, 500, origin);
    }
    if (!targetProfile || targetProfile.deleted_at !== null) {
      return json({ error: 'Member not found or already deleted.' }, 404, origin);
    }

    const { data: targetRoles, error: targetRolesError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId);

    if (targetRolesError) {
      console.error('TARGET ROLE LOOKUP FAILED:', targetRolesError);
      return json({ error: 'Could not verify the selected member roles; deletion was stopped.' }, 500, origin);
    }

    const staffRoles = new Set(['super_admin', 'admin', 'moderator']);
    if ((targetRoles ?? []).some((row) => staffRoles.has(String(row.role)))) {
      return json({ error: 'Staff accounts cannot be deleted through member management. Reassign staff duties and use a separately approved staff-offboarding process.' }, 403, origin);
    }

    // Collect only files under the target user's UUID folder and paths
    // explicitly referenced by their existing profile/verification records.
    const filesByBucket: Record<string, Set<string>> = {
      'profile-photos': new Set<string>(),
      'verification-selfies': new Set<string>(),
    };

    const { data: photoRows, error: photoError } = await admin
      .from('profile_photos')
      .select('storage_path')
      .eq('user_id', targetUserId);

    if (photoError) {
      console.error('PROFILE PHOTO LOOKUP FAILED:', photoError);
      return json({ error: 'Could not safely inspect the member photo files. Deletion was stopped.' }, 500, origin);
    }
    for (const row of photoRows ?? []) {
      if (typeof row.storage_path === 'string' && row.storage_path) {
        filesByBucket['profile-photos'].add(row.storage_path);
      }
    }

    const { data: verificationRows, error: verificationError } = await admin
      .from('verification_requests')
      .select('selfie_path')
      .eq('user_id', targetUserId);

    if (verificationError) {
      console.error('VERIFICATION FILE LOOKUP FAILED:', verificationError);
      return json({ error: 'Could not safely inspect verification files. Deletion was stopped.' }, 500, origin);
    }
    for (const row of verificationRows ?? []) {
      if (typeof row.selfie_path === 'string' && row.selfie_path) {
        filesByBucket['verification-selfies'].add(row.selfie_path);
      }
    }

    // Include any additional objects stored in the conventional per-user folder.
    try {
      for (const bucket of BUCKETS) {
        for (const path of await listUserStorageObjects(admin, bucket, targetUserId)) {
          filesByBucket[bucket].add(path);
        }
      }
    } catch (storageError) {
      console.error('STORAGE PREFLIGHT FAILED:', storageError);
      return json({ error: 'Could not safely inspect all member storage files. Deletion was stopped.' }, 500, origin);
    }

    // Delete the Auth user. Existing FK constraints determine related-row
    // behavior; a restrictive FK causes this to fail safely without bypassing it.
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error('ADMIN AUTH DELETE FAILED:', deleteError);
      return json({
        error: `Account deletion was blocked by Supabase Auth or a related database constraint: ${deleteError.message}`,
      }, 409, origin);
    }

    let cleanupComplete = true;
    for (const bucket of BUCKETS) {
      const paths = [...filesByBucket[bucket]];
      if (!paths.length) continue;

      const { error: removeError } = await admin.storage.from(bucket).remove(paths);
      if (removeError) {
        console.error('STORAGE CLEANUP FAILED:', bucket, removeError);
        cleanupComplete = false;
      }
    }

    // Store only a one-way hash, never the deleted user's email or raw UUID.
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(targetUserId),
    );
    const userHash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const { error: auditError } = await admin.from('deletion_log').insert({
      user_hash: userHash,
      cleanup_complete: cleanupComplete,
    });
    if (auditError) {
      console.error('PSEUDONYMOUS DELETION AUDIT FAILED:', auditError);
      cleanupComplete = false;
    }

    return json({
      deleted: true,
      cleanup_complete: cleanupComplete,
      message: cleanupComplete
        ? 'Member account deleted and known storage files cleaned.'
        : 'Member account deleted, but storage or audit cleanup needs administrator follow-up.',
    }, 200, origin);
  } catch (error) {
    console.error('ADMIN DELETE USER ERROR:', error);
    return json({ error: 'Unexpected account deletion error. Check Edge Function logs.' }, 500, origin);
  }
});

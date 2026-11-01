
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(Deno.env.get('ALLOWED_ORIGIN') ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && allowedOrigins.has(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
    },
  });
}

const BUCKETS = ['profile-photos', 'verification-selfies'];

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (origin && !allowedOrigins.has(origin)) {
    return json({ error: 'Origin not allowed.' }, 403, origin);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, origin);
  }

  try {
    const authorization = req.headers.get('Authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return json({ error: 'Authentication token missing.' }, 401, origin);
    }

    // Verify the actual user's access token.
    const authClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      console.error('AUTH ERROR:', authError);
      return json({ error: 'Invalid user session.' }, 401, origin);
    }

    const body = await req.json().catch(() => null);

    if (body?.confirm !== 'DELETE') {
      return json({ error: 'Deletion confirmation required.' }, 400, origin);
    }

    // Administrative client: server-side only.
    const admin = createClient(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // Collect storage files before deleting the account.
    const files: Record<string, string[]> = {};

    for (const bucket of BUCKETS) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(user.id, { limit: 1000 });

      if (error) {
        console.error('STORAGE LIST ERROR:', bucket, error);
        return json({ error: 'Could not prepare account deletion.' }, 500, origin);
      }

      files[bucket] = (data ?? [])
        .filter(file => file.name)
        .map(file => `${user.id}/${file.name}`);
    }

    // Delete only the authenticated user.
    const { error: deleteError } =
      await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('DELETE USER ERROR:', deleteError);
      return json({ error: 'Account deletion failed.' }, 500, origin);
    }

    // Remove this user's files.
    let cleanupComplete = true;

    for (const bucket of BUCKETS) {
      if (!files[bucket]?.length) continue;

      const { error } = await admin.storage
        .from(bucket)
        .remove(files[bucket]);

      if (error) {
        console.error('STORAGE CLEANUP ERROR:', bucket, error);
        cleanupComplete = false;
      }
    }

    // Write pseudonymous audit record.
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(user.id),
    );

    const userHash = Array.from(new Uint8Array(hashBuffer))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    const { error: auditError } = await admin
      .from('deletion_log')
      .insert({
        user_hash: userHash,
        cleanup_complete: cleanupComplete,
      });

    if (auditError) {
      console.error('AUDIT ERROR:', auditError);
      cleanupComplete = false;
    }

    return json({
      deleted: true,
      cleanup_complete: cleanupComplete,
    }, 200, origin);

  } catch (error) {
    console.error('DELETE ACCOUNT ERROR:', error);

    return json({
      error: 'Unexpected account deletion error.',
    }, 500, origin);
  }
});

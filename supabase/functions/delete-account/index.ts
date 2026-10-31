// Permanently deletes the calling user's account.
// Runs with the service-role key (a function secret, never sent to the browser).
// Order: authenticate -> list files -> delete auth user (DB rows cascade) -> remove files -> write audit row.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const BUCKETS = ['profile-photos', 'verification-selfies'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Not signed in.' }, 401);

  const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

  // The user id comes from the verified token, never from the request body.
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return json({ error: 'Not signed in.' }, 401);

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* handled below */ }
  if (body.confirm !== 'DELETE') return json({ error: 'Deletion was not confirmed.' }, 400);

  // 1. Collect this user's files (they live directly under "<user id>/").
  const files: Record<string, string[]> = {};
  for (const bucket of BUCKETS) {
    const { data, error } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
    if (error) return json({ error: 'Could not prepare deletion. Nothing was deleted.' }, 500);
    files[bucket] = (data ?? []).map(f => `${user.id}/${f.name}`);
  }

  // 2. Delete the auth user. Foreign keys cascade to profile, photos, likes, matches, messages, reports, consents, etc.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json({ error: 'Could not delete the account. Try again.' }, 500);

  // 3. Remove files. If this fails the account is already gone; flag it for manual cleanup.
  let cleanup = true;
  for (const bucket of BUCKETS) {
    if (!files[bucket].length) continue;
    const { error } = await admin.storage.from(bucket).remove(files[bucket]);
    if (error) cleanup = false;
  }

  // 4. Minimal audit row: pseudonymous hash + time only.
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(user.id))))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  await admin.from('deletion_log').insert({ user_hash: hash, cleanup_complete: cleanup });

  return json({ deleted: true, cleanup_complete: cleanup });
});

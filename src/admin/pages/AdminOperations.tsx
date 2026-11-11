import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Download, RefreshCw, Send, ShieldAlert, Trash2, UserRoundSearch } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { signPhotoPaths } from '../../features/discovery/api';

type User = { user_id: string; display_name: string; gender: string; city: string; created_at: string; profile_complete: boolean; verified: boolean; moderation_status: string; visibility_status: string; admin_hidden: boolean };
type AdminProfile = { user_id: string; display_name: string; date_of_birth: string; gender: string; city: string; neighbourhood: string | null; bio: string | null; languages: string[]; interests: string[]; relationship_intention: string | null; profile_complete: boolean; verified: boolean; moderation_status: string; visibility_status: string; admin_hidden: boolean; college: string | null; education_status: string | null; height: string | null; occupation: string | null; smoking: string | null; alcohol: string | null; religion: string | null; profile_prompts: unknown; photo_paths: string[]; photo_urls?: string[]; role_names: string[] };
type Candidate = { id: string; display_name: string; city: string; verified: boolean };
type CuratedRow = { batch_id: string; status: string; candidate_user_id: string; position: number; display_name: string };
type Audit = { id: string; admin_user_id: string; target_user_id: string | null; action: string; details: Record<string, unknown>; created_at: string };
type User360 = { user_id: string; display_name: string; city: string; created_at: string; profile_complete: boolean; verified: boolean; moderation_status: string; visibility_status: string; role_names: string[]; likes_sent: number; likes_received: number; active_matches: number; messages_sent: number; reports_received: number; pending_verifications: number };
type RiskRow = { user_id: string; display_name: string; city: string; moderation_status: string; verified: boolean; report_count: number; created_at: string };

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const btn = 'rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-blue-800';
const btnLight = 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50';
const field = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';

function useAdminRpc<T>(fn: string, args: Record<string, unknown> = {}) {
  const [data, setData] = useState<T[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const stableArgs = useMemo(() => args, [JSON.stringify(args)]);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await supabase.rpc(fn, stableArgs); if (result.error) throw result.error; setData((result.data ?? []) as T[]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load admin data.'); setData([]); }
    finally { setLoading(false); }
  }, [fn, stableArgs]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, error, loading, refresh };
}
function ErrorText({ error }: { error: string }) { return error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null; }
function Heading({ title, description }: { title: string; description: string }) { return <header className="mb-6"><h1 className="text-3xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></header>; }
function csvDownload(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.map(cell).join(','), ...rows.map(row => keys.map(key => cell(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export function AdminUsers() {
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [page, setPage] = useState(0), [selected, setSelected] = useState<string | null>(null);
  const { data, error, loading, refresh } = useAdminRpc<User>('admin_list_all_users', { p_search: query || null, p_limit: 30, p_offset: page * 30 });
  const [detail, setDetail] = useState<User360 | null>(null), [detailError, setDetailError] = useState(''), [detailLoading, setDetailLoading] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null), [profileError, setProfileError] = useState(''), [profileLoading, setProfileLoading] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false), [visibilityMessage, setVisibilityMessage] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false), [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false), [deleteError, setDeleteError] = useState(''), [deleteSuccess, setDeleteSuccess] = useState('');
  const [canDeleteUsers, setCanDeleteUsers] = useState(false);
  useEffect(() => {
    let active = true;
    void supabase.rpc('has_role', { r: 'super_admin' }).then(({ data: allowed, error: roleError }) => {
      if (active) setCanDeleteUsers(!roleError && allowed === true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    if (!selected) { setDetail(null); setDetailError(''); return; }
    setDetailLoading(true); setDetailError('');
    void (async () => {
      try {
        const { data: result, error: rpcError } = await supabase.rpc('admin_user_360', { p_user_id: selected });
        if (!active) return;
        if (rpcError) setDetailError(rpcError.message);
        else setDetail((Array.isArray(result) ? result[0] : result) as User360 | null);
      } catch (requestError) {
        if (active) setDetailError(requestError instanceof Error ? requestError.message : String(requestError));
      } finally {
        if (active) setDetailLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selected]);

  useEffect(() => {
    let active = true;
    if (!selected) { setProfile(null); setProfileError(''); return; }
    setProfileLoading(true); setProfileError(''); setVisibilityMessage('');
    void (async () => {
      try {
        const { data: result, error: rpcError } = await supabase.rpc('admin_user_profile', { p_user_id: selected });
        if (rpcError) throw rpcError;
        const row = (Array.isArray(result) ? result[0] : result) as AdminProfile | null;
        if (!row) throw new Error('Profile not found.');
        const urls = await signPhotoPaths(row.photo_paths ?? []);
        if (active) setProfile({ ...row, photo_urls: (row.photo_paths ?? []).map(path => urls[path]).filter((url): url is string => Boolean(url)) });
      } catch (e) {
        if (active) setProfileError(e instanceof Error ? e.message : 'Could not load full profile.');
      } finally { if (active) setProfileLoading(false); }
    })();
    return () => { active = false; };
  }, [selected]);

  async function toggleAdminHidden() {
    if (!selected || !profile || visibilityBusy) return;
    setVisibilityBusy(true); setVisibilityMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('admin_set_profile_hidden', {
        p_user_id: selected,
        p_hidden: !profile.admin_hidden,
      });
      if (rpcError) throw rpcError;
      setProfile({ ...profile, admin_hidden: !profile.admin_hidden });
      setVisibilityMessage(profile.admin_hidden ? 'Profile restored to normal Discover visibility.' : 'Profile hidden from ordinary Discover results. No notification was sent.');
      await refresh();
    } catch (e) {
      setVisibilityMessage(e instanceof Error ? e.message : 'Could not update profile visibility.');
    } finally { setVisibilityBusy(false); }
  }

  async function deleteSelectedUser() {
    if (!selected || !detail || deleteConfirmation.trim() !== 'DELETE' || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    setDeleteSuccess('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-delete-user', {
        body: { target_user_id: selected, confirm: 'DELETE' },
      });
      if (invokeError) {
        let message = invokeError.message || 'Account deletion failed.';
        const context = (invokeError as Error & { context?: unknown }).context;
        if (context instanceof Response) {
          try {
            const payload = await context.clone().json();
            if (typeof payload?.error === 'string') message = payload.error;
          } catch { /* Keep the SDK error message. */ }
        }
        throw new Error(message);
      }
      if (!data || data.deleted !== true) {
        throw new Error(data?.error || 'The server did not confirm account deletion.');
      }
      const deletedName = detail.display_name;
      setDeleteSuccess(data.cleanup_complete === true
        ? `${deletedName} was permanently deleted and known storage files were cleaned.`
        : `${deletedName} was deleted, but storage or audit cleanup needs administrator follow-up.`);
      setDeleteOpen(false);
      setDeleteConfirmation('');
      setSelected(null);
      setDetail(null);
      await refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Account deletion failed.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return <><Heading title="All Users · User 360°" description="Search real member records and inspect profile, safety and engagement activity." />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.8fr)]">
      <section className={panel}>
        <form className="mb-4 flex gap-2" onSubmit={e => { e.preventDefault(); setPage(0); setQuery(search.trim()); }}><input className={field} placeholder="Search name, city or exact user ID" value={search} onChange={e => setSearch(e.target.value)} /><button className={btn}>Search</button></form>
        <ErrorText error={error} />
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Member</th><th>Gender</th><th>City</th><th>Visibility</th><th>Verification</th><th>Joined</th></tr></thead><tbody>{data.map(u => <tr key={u.user_id} className={`cursor-pointer border-b border-slate-100 hover:bg-blue-50 ${selected === u.user_id ? 'bg-blue-50' : ''}`} onClick={() => { setSelected(u.user_id); setDeleteSuccess(''); setDeleteError(''); }}><td className="p-3"><strong>{u.display_name}</strong><div className="text-xs text-slate-400">{u.user_id}</div></td><td className="capitalize">{u.gender || '—'}</td><td>{u.city}</td><td>{u.admin_hidden ? 'Admin hidden' : u.visibility_status}</td><td>{u.verified ? 'Verified' : 'Unverified'}</td><td>{new Date(u.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div>
        {!loading && !error && data.length === 0 && <p className="p-4 text-sm text-slate-500">No matching members.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3"><button className={btnLight} disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-sm">Page {page + 1}</span><button className={btnLight} disabled={data.length < 30 || loading} onClick={() => setPage(p => p + 1)}>Next</button><button className="text-sm font-semibold text-blue-700" onClick={() => void refresh()}><RefreshCw className="mr-1 inline" size={14} />Refresh</button></div>
      </section>
      <aside className={panel}><div className="mb-3 flex items-center gap-2"><UserRoundSearch className="text-blue-700" /><h2 className="font-bold">User 360°</h2></div>{deleteSuccess && <p role="status" className="mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">{deleteSuccess}</p>}{!selected ? <p className="text-sm text-slate-500">Select a member to inspect their activity.</p> : detailLoading ? <p className="text-sm text-slate-500">Loading member activity…</p> : <><ErrorText error={detailError} />{detail && <><h3 className="text-lg font-bold">{detail.display_name}</h3><p className="break-all text-xs text-slate-400">{detail.user_id}</p><p className="mt-2 text-sm text-slate-600">{detail.city} · Joined {new Date(detail.created_at).toLocaleDateString('en-IN')}</p><div className="mt-4 grid grid-cols-2 gap-2">{[
        ['Likes sent', detail.likes_sent], ['Likes received', detail.likes_received], ['Active matches', detail.active_matches], ['Messages sent', detail.messages_sent], ['Reports received', detail.reports_received], ['Pending verification', detail.pending_verifications], ['Profile complete', detail.profile_complete ? 'Yes' : 'No'],
      ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>)}</div><div className="mt-4 border-t pt-3 text-sm"><p>Verification: <strong>{detail.verified ? 'Verified' : 'Not verified'}</strong></p><p>Moderation: <strong className="capitalize">{detail.moderation_status}</strong></p><p>Visibility: <strong>{detail.visibility_status}</strong></p><p>Roles: <strong>{detail.role_names.join(', ') || 'Member'}</strong></p></div>
        <div className="mt-5 border-t pt-4">
          <h4 className="mb-3 font-bold text-slate-900">Complete profile</h4>
          {profileLoading && <p className="text-sm text-slate-500">Loading profile…</p>}
          <ErrorText error={profileError} />
          {profile && <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">{(profile.photo_urls ?? []).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${profile.display_name} profile ${index + 1}`} className="h-24 w-24 rounded-xl object-cover" />)}</div>
            <div className="grid grid-cols-2 gap-2">{[
              ['Gender', profile.gender], ['Date of birth', profile.date_of_birth], ['Neighbourhood', profile.neighbourhood], ['Relationship intention', profile.relationship_intention], ['Education', profile.education_status], ['College', profile.college], ['Height', profile.height], ['Occupation', profile.occupation], ['Smoking', profile.smoking], ['Alcohol', profile.alcohol], ['Religion', profile.religion], ['Languages', (profile.languages ?? []).join(', ')], ['Interests', (profile.interests ?? []).join(', ')],
            ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-800">{value || '—'}</p></div>)}</div>
            <div><p className="text-xs text-slate-500">Bio</p><p className="whitespace-pre-wrap">{profile.bio || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Profile prompts</p><pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs">{JSON.stringify(profile.profile_prompts ?? [], null, 2)}</pre></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-900">Admin visibility control</p>
              <p className="mt-1 text-xs text-amber-800">This affects ordinary members' Discover results only. The user is not notified. Their own privacy setting is kept separately.</p>
              <button type="button" className={`${profile.admin_hidden ? btnLight : btn} mt-3`} disabled={visibilityBusy} onClick={() => void toggleAdminHidden()}>{visibilityBusy ? 'Saving…' : profile.admin_hidden ? 'Restore profile' : 'Hide profile temporarily'}</button>
              {visibilityMessage && <p role="status" className="mt-2 text-xs text-slate-700">{visibilityMessage}</p>}
            </div>
          </div>}
        </div>
        {canDeleteUsers && <div className="mt-5 border-t pt-4">
          {deleteError && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setDeleteError(''); setDeleteConfirmation(''); setDeleteOpen(true); }}>
            <Trash2 size={15} /> Delete User
          </button>
          <p className="mt-2 text-xs text-slate-500">Permanent deletion. Super Admin authorization is checked again on the server.</p>
        </div>}
        {canDeleteUsers && deleteOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-user-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-100 p-2 text-red-700"><Trash2 size={20} /></div>
              <div><h3 id="delete-user-title" className="text-lg font-bold text-slate-900">Permanently delete this user?</h3><p className="mt-1 text-sm text-slate-600">This removes the selected Auth account. Related database records are handled by the existing foreign-key rules. This action cannot be undone.</p></div>
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="font-semibold text-slate-900">{detail.display_name}</p><p className="break-all text-xs text-slate-500">{detail.user_id}</p></div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Type DELETE to confirm
              <input autoFocus className={`${field} mt-2`} value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder="DELETE" autoComplete="off" />
            </label>
            {deleteError && <p role="alert" className="mt-3 text-sm text-red-700">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={btnLight} disabled={deleteBusy} onClick={() => { setDeleteOpen(false); setDeleteConfirmation(''); setDeleteError(''); }}>Cancel</button>
              <button type="button" className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40" disabled={deleteBusy || deleteConfirmation.trim() !== 'DELETE'} onClick={() => void deleteSelectedUser()}>{deleteBusy ? 'Deleting…' : 'Permanently delete'}</button>
            </div>
          </section>
        </div>}
      </>}</>}</aside>
    </div></>;
}

export function AdminRoles() {
  const [search, setSearch] = useState(''), [selected, setSelected] = useState<User | null>(null), [roles, setRoles] = useState<string[]>([]), [feedback, setFeedback] = useState(''), [busy, setBusy] = useState(false);
  const { data, error, refresh } = useAdminRpc<User>('admin_list_all_users', { p_search: search || null, p_limit: 50, p_offset: 0 });
  useEffect(() => { let active = true; if (!selected) { setRoles([]); return; } void supabase.rpc('admin_list_user_roles', { p_user_id: selected.user_id }).then(({ data: result, error: rpcError }) => { if (!active) return; if (rpcError) setFeedback(rpcError.message); else setRoles((result as string[]) ?? []); }); return () => { active = false; }; }, [selected]);
  async function change(role: 'admin' | 'moderator', enabled: boolean) {
    if (!selected) return;
    if (!window.confirm(`${enabled ? 'Grant' : 'Revoke'} ${role} for ${selected.display_name}?`)) return;
    setBusy(true); setFeedback('');
    const { error: rpcError } = await supabase.rpc('admin_set_role', { p_user: selected.user_id, p_role: role, p_enabled: enabled });
    setBusy(false);
    if (rpcError) setFeedback(rpcError.message); else { setRoles(old => enabled ? [...new Set([...old, role])] : old.filter(item => item !== role)); setFeedback('Role updated and recorded in the audit log.'); void refresh(); }
  }
  return <><Heading title="Individual User Permissions" description="Role changes require Super Admin authorization inside PostgreSQL and are recorded in the existing admin audit log." /><div className="grid gap-4 lg:grid-cols-2"><div className={panel}><input className={field} value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter members" /><ErrorText error={error} /><div className="mt-3 max-h-[550px] overflow-y-auto">{data.map(u => <button key={u.user_id} className={`block w-full rounded-lg border-b p-3 text-left hover:bg-blue-50 ${selected?.user_id === u.user_id ? 'bg-blue-50' : ''}`} onClick={() => { setSelected(u); setFeedback(''); }}>{u.display_name}<span className="block text-xs text-slate-600">{u.email || 'Email unavailable'}</span><span className="block text-xs text-slate-400">{u.user_id}</span></button>)}</div></div><div className={panel}>{selected ? <><h2 className="font-bold">{selected.display_name}</h2><p className="mt-1 break-all text-sm text-slate-600">{selected.email || 'Email unavailable'}</p><p className="break-all text-xs text-slate-400">{selected.user_id}</p>{(['moderator', 'admin'] as const).map(role => <label key={role} className="mt-5 flex items-center justify-between gap-4 border-b pb-4 text-sm capitalize">{role}<input type="checkbox" checked={roles.includes(role) || roles.includes('super_admin')} disabled={busy || roles.includes('super_admin')} onChange={e => void change(role, e.target.checked)} /></label>)}<p className="mt-4 text-xs text-slate-500">Super Admin role is intentionally immutable from this screen. Only a Super Admin can grant or revoke moderator/admin roles.</p>{feedback && <p role="status" className="mt-4 text-sm">{feedback}</p>}</> : <p className="text-sm text-slate-500">Select a member to review permissions.</p>}</div></div></>;
}

export function AdminCurated() {
  const [target, setTarget] = useState(''), [user, setUser] = useState<User | null>(null), [selected, setSelected] = useState<string[]>([]), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const users = useAdminRpc<User>('admin_list_all_users', { p_search: target || null, p_limit: 30, p_offset: 0 });
  const targetId = user?.user_id ?? '00000000-0000-0000-0000-000000000000';
  const candidates = useAdminRpc<Candidate>('admin_curated_candidates_for', { p_target: targetId });
  const current = useAdminRpc<CuratedRow>('admin_curated_current', { p_target: targetId });
  const choose = (id: string) => setSelected(old => old.includes(id) ? old.filter(x => x !== id) : old.length < 25 ? [...old, id] : old);
  async function save(publish: boolean) {
    if (!user || selected.length !== 25) return;
    if (publish && !window.confirm(`Publish these 25 profiles for ${user.display_name}?`)) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.rpc('admin_curated_save', { p_target: user.user_id, p_candidates: selected, p_publish: publish });
    setBusy(false); setMessage(error ? error.message : publish ? 'Published. Discover will prioritize this batch after eligibility is rechecked.' : 'Draft saved.');
    if (!error) { void current.refresh(); void candidates.refresh(); }
  }
  return <><Heading title="Curated Matches Manager" description="Build exactly 25 unique eligible profiles. PostgreSQL validates the batch and Discover prioritizes the published batch." /><div className="grid gap-4 lg:grid-cols-[330px_1fr]"><section className={panel}><h2 className="mb-3 font-bold">1. Choose recipient</h2><input className={field} value={target} onChange={e => setTarget(e.target.value)} placeholder="Search member" /><ErrorText error={users.error} /><div className="mt-3 max-h-60 overflow-y-auto">{users.data.map(u => <button key={u.user_id} onClick={() => { setUser(u); setSelected([]); setMessage(''); }} className={`block w-full rounded-lg p-3 text-left text-sm ${user?.user_id === u.user_id ? 'bg-blue-100' : 'hover:bg-slate-50'}`}>{u.display_name}<span className="block text-xs text-slate-600">{u.email || 'Email unavailable'}</span><span className="block text-xs text-slate-400">{u.user_id}</span></button>)}</div>{user && <div className="mt-4 border-t pt-4"><strong>Recipient: {user.display_name}</strong><p className="mt-2 text-sm">Selected {selected.length}/25</p><button className="mt-2 text-sm text-blue-700 underline" onClick={() => setSelected([])}>Clear selection</button></div>}</section><section className={panel}>{!user ? <p className="text-sm text-slate-500">Choose a recipient to load eligible profiles.</p> : <><h2 className="font-bold">2. Select candidates</h2><p className="mb-4 text-xs text-slate-500">Candidates must currently satisfy profile visibility, moderation, age/gender preference, block, like, pass and match filters. Eligibility is rechecked at publish time.</p><ErrorText error={candidates.error} /><div className="grid max-h-[450px] gap-2 overflow-y-auto sm:grid-cols-2">{candidates.data.map(c => <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selected.includes(c.id)} disabled={!selected.includes(c.id) && selected.length >= 25} onChange={() => choose(c.id)} /><span><strong>{c.display_name}</strong><small className="block text-slate-500">{c.city} · {c.verified ? 'Verified' : 'Unverified'}</small></span></label>)}</div><div className="mt-5 flex flex-wrap gap-2"><button className={btn} disabled={busy || selected.length !== 25} onClick={() => void save(false)}>Save draft</button><button className={btn} disabled={busy || selected.length !== 25} onClick={() => void save(true)}>Publish 25 profiles</button><button className={btnLight} onClick={() => void candidates.refresh()}>Refresh candidates</button></div>{message && <p role="status" className="mt-3 text-sm">{message}</p>}<div className="mt-5 border-t pt-4"><h3 className="font-bold">Current batch</h3><ErrorText error={current.error} />{current.data.length ? <><p className="text-xs text-slate-500">{current.data[0].status} · {current.data.length} profiles</p><ol className="mt-2 list-inside list-decimal space-y-1 text-sm">{current.data.map(row => <li key={row.candidate_user_id}>{row.display_name}</li>)}</ol></> : <p className="text-sm text-slate-500">No batch saved yet.</p>}</div></>}</section></div></>;
}

export function AdminAudit() {
  const { data, error, loading, refresh } = useAdminRpc<Audit>('admin_list_audit', { p_limit: 200 });
  return <><Heading title="Audit Logs" description="Administrative actions recorded in the existing admin_audit_logs table." /><section className={panel}><button className={`${btnLight} mb-4`} onClick={() => void refresh()}> <RefreshCw className="mr-1 inline" size={14} />Refresh</button><ErrorText error={error} />{loading && <p>Loading…</p>}<div className="space-y-2">{data.map(a => <div key={a.id} className="rounded-xl border p-3 text-sm"><strong>{a.action.replace(/_/g, ' ')}</strong><span className="ml-3 text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</span><p className="mt-1 break-all text-xs text-slate-500">Admin: {a.admin_user_id} · Subject: {a.target_user_id || '—'}</p><pre className="mt-1 whitespace-pre-wrap break-all text-xs">{JSON.stringify(a.details, null, 2)}</pre></div>)}{!loading && !error && !data.length && <p className="text-sm text-slate-500">No recorded admin operations.</p>}</div></section></>;
}

export function AdminRiskQueue() {
  const { data, error, loading, refresh } = useAdminRpc<RiskRow>('admin_risk_queue', { p_min_reports: 2 });
  return <><Heading title="Fake Account Risk Review" description="Rule-based review queue for accounts with multiple user reports. A risk signal is not a finding that an account is fake." /><section className={panel}><button className={`${btnLight} mb-4`} onClick={() => void refresh()}>Refresh queue</button><ErrorText error={error} />{loading && <p>Loading…</p>}<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Account</th><th>Reports</th><th>Verification</th><th>Status</th><th>Joined</th></tr></thead><tbody>{data.map(row => <tr key={row.user_id} className="border-b"><td className="p-3">{row.display_name}<span className="block text-xs text-slate-400">{row.city} · {row.user_id}</span></td><td className="font-bold">{row.report_count}</td><td>{row.verified ? 'Verified' : 'Unverified'}</td><td className="capitalize">{row.moderation_status}</td><td>{new Date(row.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div>{!loading && !error && !data.length && <p className="py-4 text-sm text-slate-500">No accounts currently meet the report-count threshold.</p>}</section></>;
}

export function AdminAnnouncements() {
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [path, setPath] = useState('');
  const [audience, setAudience] = useState<'all' | 'single'>('all');
  const [memberSearch, setMemberSearch] = useState(''), [recipient, setRecipient] = useState('');
  const [members, setMembers] = useState<User[]>([]), [membersLoading, setMembersLoading] = useState(false), [membersError, setMembersError] = useState('');
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    async function loadMembers() {
      setMembersLoading(true); setMembersError('');
      try {
        const all: User[] = []; let offset = 0;
        while (true) {
          const { data, error } = await supabase.rpc('admin_list_members', { p_search: null, p_limit: 200, p_offset: offset });
          if (error) throw error;
          const rows = (data ?? []) as User[]; all.push(...rows);
          if (rows.length < 200) break;
          offset += rows.length;
          if (all.length >= 20000) break;
        }
        if (active) setMembers(all);
      } catch (e) { if (active) setMembersError(e instanceof Error ? e.message : 'Could not load members.'); }
      finally { if (active) setMembersLoading(false); }
    }
    void loadMembers();
    return () => { active = false; };
  }, []);

  const filteredMembers = members.filter(member => `${member.display_name} ${member.city} ${member.user_id}`.toLowerCase().includes(memberSearch.toLowerCase()));

  async function submit(e: FormEvent) {
    e.preventDefault(); if (!title.trim() || !body.trim() || (audience === 'single' && !recipient)) return;
    const recipientName = audience === 'all' ? 'all non-deleted members' : members.find(m => m.user_id === recipient)?.display_name || 'the selected member';
    if (!window.confirm(`Send this notification to ${recipientName}? It will disappear from the notification centre after 7 days.`)) return;
    setBusy(true); setFeedback('');
    const { data, error } = await supabase.rpc('admin_send_notification', {
      p_recipient_user_id: audience === 'all' ? null : recipient,
      p_title: title.trim(), p_body: body.trim(), p_action_path: path.trim() || null,
    });
    setBusy(false);
    setFeedback(error ? error.message : `Notification sent to ${Number(data) || 0} member account(s). It expires after 7 days.`);
    if (!error) { setTitle(''); setBody(''); setPath(''); if (audience === 'single') setRecipient(''); }
  }

  return <><Heading title="Notifications" description="Send a personal notification to one member or an announcement to all members. Notifications automatically disappear from the in-app centre after seven days." />
    <form className={`${panel} max-w-2xl space-y-4`} onSubmit={submit}>
      <fieldset><legend className="mb-2 text-sm font-semibold">Send notification to</legend><div className="flex flex-wrap gap-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="radio" name="audience" checked={audience === 'all'} onChange={() => setAudience('all')} /> All users</label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="radio" name="audience" checked={audience === 'single'} onChange={() => setAudience('single')} /> Selected user</label>
      </div></fieldset>
      {audience === 'single' && <div className="space-y-2"><label className="block text-sm font-semibold">Find member<input className={`${field} mt-1`} placeholder="Search name, city or user ID" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} /></label><label className="block text-sm font-semibold">Select recipient<select className={`${field} mt-1`} value={recipient} onChange={e => setRecipient(e.target.value)} required><option value="">Choose a member…</option>{filteredMembers.map(member => <option key={member.user_id} value={member.user_id}>{member.display_name} · {member.city || 'No city'} · {member.user_id.slice(0, 8)}</option>)}</select></label>{membersLoading && <p className="text-xs text-slate-500">Loading registered members…</p>}<ErrorText error={membersError} />{!membersLoading && !membersError && filteredMembers.length === 0 && <p className="text-xs text-slate-500">No matching members.</p>}</div>}
      <label className="block text-sm font-semibold">Title<input className={`${field} mt-1`} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} required /></label>
      <label className="block text-sm font-semibold">Message<textarea className={`${field} mt-1 min-h-32`} maxLength={1000} value={body} onChange={e => setBody(e.target.value)} required /></label>
      <label className="block text-sm font-semibold">Optional in-app destination<input className={`${field} mt-1`} placeholder="/discover" value={path} onChange={e => setPath(e.target.value)} /></label>
      <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">Notifications are visible for seven days from the sending time, then automatically hidden from the user's notification centre. Existing likes, matches and message notifications continue to work.</p>
      <button className={btn} disabled={busy || !title.trim() || !body.trim() || (audience === 'single' && (!recipient || membersLoading))}><Send className="mr-2 inline" size={15} />{busy ? 'Sending…' : audience === 'all' ? 'Send to all users' : 'Send personal notification'}</button>
      {feedback && <p role="status" className="text-sm">{feedback}</p>}
    </form></>;
}

export function AdminHealth() {
  const { data, error, loading, refresh } = useAdminRpc<Record<string, unknown>>('admin_platform_health');
  const row = data[0] ?? (data as unknown as Record<string, unknown>);
  return <><Heading title="Platform Health" description="Read-only database-level operational counters. This does not claim to measure Supabase hosting, storage or network availability." /><section className={panel}><button className={`${btnLight} mb-4`} onClick={() => void refresh()}>Refresh diagnostics</button><ErrorText error={error} />{loading ? <p>Loading diagnostics…</p> : row && Object.keys(row).length ? <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(row).map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs uppercase tracking-wide text-slate-500">{key.replace(/_/g, ' ')}</dt><dd className="mt-1 break-all text-lg font-bold text-slate-900">{String(value)}</dd></div>)}</dl> : !error && <p className="text-sm text-slate-500">No health data returned.</p>}</section></>;
}

export function AdminExport() {
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState('');
  async function exportMembers() {
    setBusy(true); setFeedback('');
    try {
      const all: User[] = []; let offset = 0;
      while (true) {
        const { data, error } = await supabase.rpc('admin_list_members', { p_search: null, p_limit: 200, p_offset: offset });
        if (error) throw error;
        const rows = (data ?? []) as User[]; all.push(...rows); if (rows.length < 200) break; offset += 200;
        if (all.length > 50000) throw new Error('Export exceeds the safety limit of 50,000 member rows.');
      }
      csvDownload(`mumbai-afterhours-members-${new Date().toISOString().slice(0, 10)}.csv`, all.map(({ user_id, display_name, city, created_at, profile_complete, verified, moderation_status }) => ({ user_id, display_name, city, created_at, profile_complete, verified, moderation_status })));
      setFeedback(`Exported ${all.length} member records. This export excludes private messages, email addresses and authentication credentials.`);
    } catch (e) { setFeedback(e instanceof Error ? e.message : 'Export failed.'); }
    finally { setBusy(false); }
  }
  return <><Heading title="Data Export & Account Safety" description="Export the authorized member directory. Account deletion remains governed by the existing secure account-deletion workflow; this screen does not expose irreversible bulk deletion." /><section className={`${panel} max-w-2xl`}><h2 className="font-bold">Member directory export</h2><p className="my-2 text-sm text-slate-600">Exports member IDs, display names, city, join date, profile/verification/moderation status through the protected admin RPC.</p><button className={btn} disabled={busy} onClick={() => void exportMembers()}><Download className="mr-2 inline" size={15} />{busy ? 'Preparing export…' : 'Export members CSV'}</button>{feedback && <p role="status" className="mt-3 text-sm">{feedback}</p>}<div className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><ShieldAlert className="mr-2 inline" size={16} />No admin account deletion action is exposed until a dedicated server-side deletion workflow and retention policy are approved.</div></section></>;
}

export function AdminModule({ title, description }: { title: string; description: string }) {
  return <><Heading title={title} description={description} /><section className={panel}><h2 className="font-bold">Not enabled in this build</h2><p className="mt-2 text-sm text-slate-600">This capability is not represented by a verified server-side operation in the supplied database export. No fake controls or sample records are shown.</p></section></>;
}

import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ModerationNav } from '../components/layout/ModerationNav';
import { listPending, review, myRoles, REASONS, type Pending } from '../features/verification/api';

type Item = Pending & { selfieUrl: string; photoUrls: string[] };

export default function ModerationPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reason, setReason] = useState('photos_dont_match');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const rows = await listPending();
      const out: Item[] = [];
      for (const r of rows) {
        const s = await supabase.storage.from('verification-selfies').createSignedUrl(r.selfie_path, 600);
        const p = await supabase.storage.from('profile-photos').createSignedUrls(r.photo_paths, 600);
        out.push({ ...r, selfieUrl: s.data?.signedUrl ?? '', photoUrls: (p.data ?? []).map(x => x.signedUrl) });
      }
      setItems(out);
    } catch (e) { setErr((e as Error).message); }
  }, []);

  useEffect(() => {
    let active = true;
    const checkAccess = async () => {
      try {
        const roles = await myRoles();
        const ok = roles.includes('moderator') || roles.includes('admin') || roles.includes('super_admin');
        if (!active) return;
        setAllowed(ok);
        if (ok) await load();
      } catch (error) {
        if (active) {
          setAllowed(false);
          setErr(error instanceof Error ? error.message : 'Unable to verify moderation access.');
        }
      }
    };
    void checkAccess();
    return () => { active = false; };
  }, [load]);

  async function decide(it: Item, d: 'approved' | 'rejected' | 'retry') {
    setBusy(it.request_id); setMsg(null); setErr(null);
    try {
      const deleted = await review(it.request_id, d, d === 'approved' ? undefined : reason);
      setMsg(deleted ? 'Decision recorded and selfie deleted.' : 'Decision recorded, but the selfie file could not be deleted. Remove it manually in Storage.');
      await load();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  if (allowed === null) return <p className="text-slate2" role="status">Checking access…</p>;
  if (!allowed) return <Navigate to="/discover" replace />;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Moderation</h1><ModerationNav />
      <p className="text-slate2">Approve only if the selfie clearly shows the same person as all three photos. This is a visual check. It does not confirm identity or detect replayed images.</p>
      {msg && <p role="status" className="text-ok">{msg}</p>}{err && <p role="alert" className="text-bad">{err}</p>}
      {items.length === 0 && !err && <p className="card p-6 text-center text-slate2">No selfies waiting for review.</p>}
      {items.map(it => (
        <section key={it.request_id} className="card space-y-3 p-4">
          <h2 className="font-bold">{it.display_name}</h2>
          <div className="grid grid-cols-4 gap-2">
            <figure><img src={it.selfieUrl} alt="Selfie" className="aspect-[3/4] w-full -scale-x-100 rounded-lg object-cover" /><figcaption className="text-sm text-slate2">Selfie</figcaption></figure>
            {it.photoUrls.map((u, i) => <img key={i} src={u} alt={`Profile photo ${i + 1}`} className="aspect-[3/4] w-full rounded-lg object-cover" />)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" disabled={busy === it.request_id} onClick={() => decide(it, 'approved')}>Approve</button>
            <select className="field w-auto" value={reason} onChange={e => setReason(e.target.value)} aria-label="Reason code">
              {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button className="btn-outline" disabled={busy === it.request_id} onClick={() => decide(it, 'retry')}>Ask to retry</button>
            <button className="btn-outline" disabled={busy === it.request_id} onClick={() => decide(it, 'rejected')}>Reject</button>
          </div>
        </section>))}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, MessageCircle } from 'lucide-react';
import { listMatches, unmatch, getSeenAt, markSeen, type MatchItem } from '../features/matches/api';
import { Modal } from '../components/ui/Modal';

export default function MatchesPage() {
  const [items, setItems] = useState<MatchItem[] | null>(null);
  const [seenAt] = useState(getSeenAt);
  const [err, setErr] = useState<string | null>(null);
  const [target, setTarget] = useState<MatchItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try { setItems(await listMatches()); markSeen(); } catch (e) { setErr((e as Error).message); setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function confirmUnmatch() {
    if (!target) return;
    setBusy(true);
    try { await unmatch(target.match_id); setTarget(null); await load(); } catch (e) { setErr((e as Error).message); setTarget(null); } finally { setBusy(false); }
  }

  if (!items) return <p className="text-slate2" role="status">Loading your matches…</p>;
  const isNew = (m: MatchItem) => !seenAt || m.matched_at > seenAt;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Matches</h1>
      {err && <p role="alert" className="text-bad">{err} <button className="underline" onClick={load}>Retry</button></p>}
      {items.length === 0 && !err ? (
        <div className="card p-8 text-center"><p className="font-bold">No matches yet</p>
          <p className="mt-1 text-slate2">When you and someone else like each other, they will appear here.</p>
          <Link to="/discover" className="btn-primary mt-4">Go to Discover</Link></div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map(m => (
            <li key={m.match_id} className="card overflow-hidden">
              <div className="relative aspect-[3/4] bg-mist">
                {m.photoUrl && <img src={m.photoUrl} alt={`${m.display_name}`} loading="lazy" className="h-full w-full object-cover" />}
                {isNew(m) && <span className="absolute left-2 top-2 rounded-full bg-royal px-3 py-1 text-sm font-bold text-white">New</span>}
              </div>
              <div className="space-y-2 p-3">
                <p className="flex items-center gap-1 font-extrabold">{m.display_name}, {m.age}{m.verified && <BadgeCheck className="h-5 w-5 text-royal" aria-label="Verified" />}</p>
                <p className="text-sm text-slate2">Matched {new Date(m.matched_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                <Link to={`/chat/${m.conversation_id}`} className="btn-primary w-full py-2"><MessageCircle className="h-5 w-5" aria-hidden />Start conversation</Link>
                <button className="w-full text-sm text-slate2 underline" onClick={() => setTarget(m)}>Unmatch</button>
              </div>
            </li>))}
        </ul>)}
      <Modal open={!!target} onClose={() => setTarget(null)} title={`Unmatch ${target?.display_name ?? ''}?`}>
        <p className="text-slate2">You will no longer be able to message each other, and you will not see each other again. This cannot be undone.</p>
        <div className="flex gap-3"><button className="btn-outline flex-1" onClick={() => setTarget(null)}>Cancel</button>
          <button className="btn-primary flex-1" disabled={busy} onClick={confirmUnmatch}>{busy ? 'Unmatching…' : 'Unmatch'}</button></div>
      </Modal>
    </div>
  );
}

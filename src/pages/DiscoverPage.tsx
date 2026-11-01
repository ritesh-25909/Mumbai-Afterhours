import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { fetchCandidates, likeUser, passUser, type Candidate } from '../features/discovery/api';
import { localMatches } from '../features/matches/useMatchNotifications';
import { ProfileCard } from '../components/discover/ProfileCard';
import { ReportBlock } from '../components/discover/ReportBlock';
import { Modal } from '../components/ui/Modal';

export default function DiscoverPage() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const [queue, setQueue] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [matched, setMatched] = useState<Candidate | null>(null);
  const handled = useRef(new Set<string>());
  const loadingMore = useRef(false);

  const load = useCallback(async () => {
    if (loadingMore.current) return;
    loadingMore.current = true;
    try {
      const rows = await fetchCandidates();
      setQueue(q => {
        const have = new Set(q.map(x => x.id));
        const fresh = rows.filter(r => !have.has(r.id) && !handled.current.has(r.id));
        if (fresh.length === 0 && q.length === 0) setExhausted(true);
        return [...q, ...fresh];
      });
      setErr(null);
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); loadingMore.current = false; }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!loading && queue.length > 0 && queue.length < 3 && !exhausted) load(); }, [queue.length, loading, exhausted, load]);

  const current = queue[0];
  const advance = () => { if (current) handled.current.add(current.id); setQueue(q => q.slice(1)); };

  async function act(kind: 'like' | 'pass') {
    if (!current || busy) return;
    setBusy(true); setErr(null);
    try {
      if (kind === 'like') {
        const r = await likeUser(current.id);
        if (r.matched && r.match_id) { localMatches.add(r.match_id); setMatched(current); }
      } else await passUser(current.id);
      advance();
    } catch (e) {
      const m = (e as Error).message;
      setErr(m);
      if (m.includes('no longer available')) advance();
    } finally { setBusy(false); }
  }

  if (loading) return <p className="text-center text-slate2" role="status">Finding people for you…</p>;
  return (
    <div className="space-y-4">
      {err && <p role="alert" className="mx-auto max-w-md rounded-lg border border-bad/30 bg-white p-3 text-bad">{err}{!current && <button className="ml-2 underline" onClick={load}>Retry</button>}</p>}
      {current ? (<>
        <ProfileCard key={current.id} c={current} busy={busy} onLike={() => act('like')} onPass={() => act('pass')} />
        <ReportBlock key={`rb-${current.id}`} uid={uid} targetId={current.id} name={current.display_name} onBlocked={advance} />
      </>) : !err && (
        <div className="card mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-extrabold">You're all caught up</h1>
          <p className="mt-2 text-slate2">There is nobody new who fits your preferences right now. Check back later, or widen your age range in your profile.</p>
          <button className="btn-outline mt-4" onClick={() => { setExhausted(false); setLoading(true); load(); }}>Check again</button>
        </div>)}
      <Modal open={!!matched} onClose={() => setMatched(null)} title="It's a match">
        <p>You and {matched?.display_name} like each other.</p>
        <div className="flex gap-3"><button className="btn-outline flex-1" onClick={() => setMatched(null)}>Keep swiping</button>
          <Link to="/matches" className="btn-primary flex-1">See Liked You</Link></div>
      </Modal>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MoreHorizontal, Send, AlertCircle } from 'lucide-react';
import { fetchMessages, getConversation, markRead, sendMessage, SendError, PAGE, type ConversationHeader, type Msg } from '../../features/messaging/api';
import { supabase } from '../../lib/supabase';
import { unmatch } from '../../features/matches/api';
import { useMessageEvents, useRealtimeLive } from '../../features/messaging/ChatEvents';
import { ReportBlock } from '../discover/ReportBlock';
import { Modal } from '../ui/Modal';

type UIMsg = Msg & { status?: 'sending' | 'failed' };
const merge = (a: UIMsg[], b: UIMsg[]) => {
  const map = new Map<string, UIMsg>(); [...a, ...b].forEach(m => map.set(m.id, { ...map.get(m.id), ...m, status: m.status ?? undefined }));
  return [...map.values()].sort((x, y) => x.created_at.localeCompare(y.created_at));
};
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function ConversationView({ id, uid, onRead }: { id: string; uid: string; onRead: () => void }) {
  const nav = useNavigate();
  const live = useRealtimeLive();
  const [head, setHead] = useState<ConversationHeader | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<UIMsg[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [unmatchOpen, setUnmatchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const read = useCallback(() => { if (document.visibilityState === 'visible') markRead(id).then(onRead); }, [id, onRead]);

  const load = useCallback(async () => {
    setErr(null); setLoading(true); setHead(undefined); setMsgs([]);
    try {
      const h = await getConversation(id);
      setHead(h);
      if (h?.is_open) { const m = await fetchMessages(id); setMsgs(m); setHasMore(m.length === PAGE); stick.current = true; read(); }
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  }, [id, read]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (stick.current) bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  useMessageEvents(m => {
    if (m.conversation_id !== id) return;
    stick.current = true;
    setMsgs(cur => merge(cur, [m]));
    if (m.sender_user_id !== uid) read();
  });
  // Fallback when realtime is not connected: poll for new messages.
  useEffect(() => {
    if (live || !head?.is_open) return;
    const t = setInterval(() => { fetchMessages(id).then(m => { setMsgs(cur => merge(cur, m)); read(); }).catch(() => {}); }, 8000);
    return () => clearInterval(t);
  }, [live, head?.is_open, id, read]);

  async function loadEarlier() {
    if (!msgs.length) return;
    try { stick.current = false; const older = await fetchMessages(id, msgs[0].created_at); setMsgs(cur => merge(older, cur)); setHasMore(older.length === PAGE); }
    catch (e) { setErr((e as Error).message); }
  }

  async function deliver(m: UIMsg) {
    setMsgs(cur => cur.map(x => x.id === m.id ? { ...x, status: 'sending' } : x));
    try { await sendMessage(m.id, id, uid, m.content); setMsgs(cur => cur.map(x => x.id === m.id ? { ...x, status: undefined } : x)); setSendErr(null); }
    catch (e) {
      const se = e as SendError;
      if (se.duplicate) return setMsgs(cur => cur.map(x => x.id === m.id ? { ...x, status: undefined } : x));
      if (se.closed) { setHead(h => h && { ...h, is_open: false }); setMsgs(cur => cur.filter(x => x.id !== m.id)); }
      else setMsgs(cur => cur.map(x => x.id === m.id ? { ...x, status: 'failed' } : x));
      setSendErr(se.message);
    }
  }
  async function doUnmatch() {
    setBusy(true);
    try {
      const { data, error } = await supabase.from('conversations').select('match_id').eq('id', id).single();
      if (error || !data) throw new Error('Could not unmatch. Try again.');
      await unmatch(data.match_id as string);
      nav('/inbox');
    } catch (e) { setErr((e as Error).message); setUnmatchOpen(false); } finally { setBusy(false); }
  }
  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const content = text.trim(); if (!content) return;
    setText(''); stick.current = true;
    const m: UIMsg = { id: crypto.randomUUID(), sender_user_id: uid, content, created_at: new Date().toISOString(), status: 'sending' };
    setMsgs(cur => merge(cur, [m])); deliver(m);
  }


  if (loading) return <p className="p-6 text-slate2" role="status">Loading conversation…</p>;
  if (err && !head) return <p className="p-6 text-bad" role="alert">{err} <button className="underline" onClick={load}>Retry</button></p>;
  if (!head || !head.is_open) return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div><p className="font-bold">This conversation is no longer available.</p>
        <p className="mt-1 text-slate2">The match may have ended.</p><Link to="/inbox" className="btn-outline mt-4">Back to messages</Link></div></div>);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-line p-3">
        <Link to="/inbox" aria-label="Back to messages" className="md:hidden"><ArrowLeft className="h-6 w-6" /></Link>
        {head.photoUrl ? <img src={head.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="h-10 w-10 rounded-full bg-line" />}
        <p className="flex min-w-0 flex-1 items-center gap-1 font-extrabold"><span className="truncate">{head.display_name}</span>{head.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-royal" aria-label="Verified" />}</p>
        <button aria-label="More options" aria-expanded={menu} onClick={() => setMenu(m => !m)} className="rounded-lg p-2 hover:bg-mist"><MoreHorizontal className="h-5 w-5" /></button>
      </header>
      {menu && (
        <div className="space-y-3 border-b border-line bg-mist p-3">
          <ReportBlock uid={uid} targetId={head.user_id!} name={head.display_name!} onBlocked={() => nav('/inbox')} />
          <div className="text-center"><button className="text-sm text-slate2 underline" onClick={() => setUnmatchOpen(true)}>Unmatch</button></div>
        </div>)}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-live="polite">
        {hasMore && <button className="mx-auto block text-sm font-semibold text-royal" onClick={loadEarlier}>Load earlier messages</button>}
        {msgs.length === 0 && <p className="mt-10 text-center text-slate2">You matched with {head.display_name}. Say hello.</p>}
        {msgs.map((m, i) => {
          const mine = m.sender_user_id === uid;
          const newDay = i === 0 || new Date(m.created_at).toDateString() !== new Date(msgs[i - 1].created_at).toDateString();
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-xs text-slate2">{dayLabel(m.created_at)}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 ${mine ? 'bg-royal text-white' : 'bg-mist'} ${m.status === 'sending' ? 'opacity-60' : ''}`}>{m.content}</div>
              </div>
              <p className={`mt-0.5 flex items-center gap-1 text-xs text-slate2 ${mine ? 'justify-end' : ''}`}>
                {m.status === 'sending' ? 'Sending…' : m.status === 'failed' ? (<><AlertCircle className="h-3.5 w-3.5 text-bad" aria-hidden /><span className="text-bad">Not sent.</span><button className="underline" onClick={() => deliver(m)}>Retry</button></>) : timeLabel(m.created_at)}
              </p>
            </div>);
        })}
        <div ref={bottom} />
      </div>
      {(sendErr || err) && <p role="alert" className="px-3 pb-1 text-sm text-bad">{sendErr ?? err}</p>}
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-3">
        <label className="min-w-0 flex-1"><span className="sr-only">Message</span>
          <textarea className="field max-h-32 resize-none py-2.5" rows={1} maxLength={2000} placeholder="Write a message" value={text}
            onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} /></label>
        <button className="btn-primary h-11 px-4" disabled={!text.trim()} aria-label="Send message"><Send className="h-5 w-5" /></button>
      </form>
      <Modal open={unmatchOpen} onClose={() => setUnmatchOpen(false)} title={`Unmatch ${head.display_name}?`}>
        <p className="text-slate2">This ends the conversation for both of you and hides the message history. It cannot be undone.</p>
        <div className="flex gap-3"><button className="btn-outline flex-1" onClick={() => setUnmatchOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" disabled={busy} onClick={doUnmatch}>{busy ? 'Unmatching…' : 'Unmatch'}</button></div>
      </Modal>
    </div>
  );
}

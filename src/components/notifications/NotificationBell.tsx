import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Heart, MessageCircle, ShieldCheck, CalendarDays,
  BadgeCheck, Megaphone, X, CheckCheck, ArrowUpRight,
  Sparkles, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { signPhotoPaths } from '../../features/discovery/api';

type NotificationRow = {
  id: string;
  notification_type: 'like' | 'match' | 'comment' | 'message' | 'date_invitation' | 'verification' | 'security_alert' | 'announcement';
  actor_user_id: string | null;
  actor_name: string;
  actor_verified: boolean;
  actor_photo_path: string | null;
  like_comment: string | null;
  match_id: string | null;
  created_at: string;
  read_at: string | null;
  title: string;
  body: string | null;
  action_path: string | null;
  entity_id: string | null;
};
type NotificationItem = NotificationRow & { photoUrl: string | null };

const typeStyle: Record<NotificationRow['notification_type'], { icon: typeof Heart; tone: string; label: string }> = {
  like: { icon: Heart, tone: 'bg-rose-50 text-rose-600', label: 'Like' },
  comment: { icon: MessageCircle, tone: 'bg-violet-50 text-violet-600', label: 'Comment' },
  match: { icon: Sparkles, tone: 'bg-blue-50 text-blue-600', label: 'Match' },
  message: { icon: MessageCircle, tone: 'bg-indigo-50 text-indigo-600', label: 'Message' },
  date_invitation: { icon: CalendarDays, tone: 'bg-amber-50 text-amber-600', label: 'Date invitation' },
  verification: { icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-600', label: 'Verification' },
  security_alert: { icon: ShieldCheck, tone: 'bg-orange-50 text-orange-600', label: 'Security' },
  announcement: { icon: Megaphone, tone: 'bg-sky-50 text-sky-600', label: 'Announcement' },
};

function timeLabel(value: string) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function NotificationBell({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const instanceId = useId();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('list_notifications');
      if (rpcError) throw rpcError;
      const rows = (data ?? []) as NotificationRow[];
      const paths = rows.map((row) => row.actor_photo_path).filter((path): path is string => Boolean(path));
      const urls = await signPhotoPaths(paths);
      setItems(rows.map((row) => ({
        ...row,
        photoUrl: row.actor_photo_path ? urls[row.actor_photo_path] ?? null : null,
      })));
    } catch (e) {
      setError((e as Error).message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void load();
    const channel = supabase.channel(`notifications:${uid}:${instanceId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `recipient_user_id=eq.${uid}`,
      }, () => { if (active) void load(); })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [uid, load, instanceId]);

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  async function markRead(item: NotificationItem) {
    if (item.read_at || busy) return;
    setBusy(item.id);
    const { error: markError } = await supabase.rpc('mark_notification_read', { notification_id: item.id });
    if (!markError) setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
    setBusy(null);
  }

  async function markAllRead() {
    if (!unread || busy) return;
    setBusy('all');
    const { error: markError } = await supabase.rpc('mark_all_notifications_read');
    if (!markError) {
      const now = new Date().toISOString();
      setItems((current) => current.map((row) => row.read_at ? row : { ...row, read_at: now }));
    } else setError(markError.message);
    setBusy(null);
  }

  function openItem(item: NotificationItem) {
    void markRead(item);
    setOpen(false);
    const fallback = item.notification_type === 'match' ? '/matches'
      : item.notification_type === 'message' && item.match_id ? `/chat/${item.match_id}`
      : item.actor_user_id ? `/user/${item.actor_user_id}` : '/discover';
    const path = item.action_path?.startsWith('/') && !item.action_path.startsWith('//') ? item.action_path : fallback;
    navigate(path);
  }

  return (
    <div className="relative flex justify-end">
      <button type="button" onClick={() => { const next = !open; setOpen(next); if (next) void load(); }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-royal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && <>
        <button aria-label="Close notifications panel" className="fixed inset-0 z-40 cursor-default bg-slate-950/10 md:bg-transparent" onClick={() => setOpen(false)} />
        <section aria-label="Notifications" className="absolute right-0 top-12 z-50 flex max-h-[min(76vh,620px)] w-[min(94vw,410px)] flex-col overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
          <header className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white to-blue-50/70 px-4 py-4">
            <div><div className="flex items-center gap-2"><h2 className="text-base font-extrabold tracking-tight text-slate-900">Notifications</h2>{unread > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">{unread} new</span>}</div><p className="mt-0.5 text-xs text-slate-500">Your latest activity, all in one place</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </header>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <button type="button" disabled={!unread || !!busy} onClick={() => void markAllRead()} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 transition hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"><CheckCheck className="h-3.5 w-3.5" />Mark all as read</button>
            <button type="button" onClick={() => setShowAll((v) => !v)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-700">{showAll ? 'Show recent' : 'View all notifications'}<ArrowUpRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading && items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Loading notifications…</p>
              : error ? <div className="p-5 text-center text-sm text-rose-600">{error}<button type="button" onClick={() => void load()} className="ml-2 font-bold underline">Retry</button></div>
              : items.length === 0 ? <div className="px-6 py-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-500"><Bell className="h-6 w-6" /></span><p className="mt-3 font-bold text-slate-800">You're all caught up</p><p className="mt-1 text-xs text-slate-500">Likes, messages and important updates will appear here.</p></div>
              : <ul className="divide-y divide-slate-100">{(showAll ? items : items.slice(0, 8)).map((item) => {
                const style = typeStyle[item.notification_type];
                const Icon = style.icon;
                const actorName = item.actor_name || 'Mumbai Afterhours';
                return <li key={item.id}>
                  <div className={`flex gap-3 px-4 py-3.5 transition hover:bg-blue-50/70 ${item.read_at ? 'bg-white' : 'bg-blue-50/45'}`}>
                    <button type="button" onClick={() => openItem(item)} className="flex min-w-0 flex-1 gap-3 text-left">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">{item.photoUrl ? <img src={item.photoUrl} alt="" className="h-full w-full object-cover" /> : <span className={`grid h-full w-full place-items-center ${style.tone}`}><Icon className="h-5 w-5" /></span>}</span>
                      <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-[13px] font-extrabold text-slate-900">{item.actor_user_id ? actorName : (item.title || style.label)}</span>{item.actor_verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />}</span><span className="mt-0.5 block text-xs leading-[1.45rem] text-slate-600">{item.body || item.title || (item.notification_type === 'like' ? `${actorName} liked your profile.` : `${actorName} sent you an update.`)}</span>{item.like_comment && item.body !== item.like_comment && <span className="mt-1 block line-clamp-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs italic text-slate-600">“{item.like_comment}”</span>}<span className="mt-1.5 block text-[10px] font-medium text-slate-400">{timeLabel(item.created_at)}</span></span>
                    </button>
                    <div className="flex shrink-0 flex-col items-end justify-between">{!item.read_at ? <span className="mt-2 h-2 w-2 rounded-full bg-blue-600 ring-4 ring-blue-100" /> : <span className="h-2" />}{!item.read_at && <button type="button" onClick={() => void markRead(item)} className="text-[10px] font-bold text-blue-700 hover:text-blue-900">Mark as read</button>}</div>
                  </div>
                </li>;
              })}</ul>}
          </div>
          <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-3"><span className="text-[10px] text-slate-400">Private to your account</span><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />Refresh</button></footer>
        </section>
      </>}
    </div>
  );
}

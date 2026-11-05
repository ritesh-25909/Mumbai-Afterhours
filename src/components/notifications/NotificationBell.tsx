import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageCircle, X } from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { signPhotoPaths } from '../../features/discovery/api';

type NotificationRow = {
  id: string;
  notification_type: 'like' | 'match';
  actor_user_id: string;
  actor_name: string;
  actor_verified: boolean;
  actor_photo_path: string | null;
  like_comment: string | null;
  match_id: string | null;
  created_at: string;
  read_at: string | null;
};

type NotificationItem = NotificationRow & {
  photoUrl: string | null;
};

export function NotificationBell({ uid }: { uid: string }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('list_notifications');
      if (rpcError) throw rpcError;

      const rows = (data ?? []) as NotificationRow[];
      const paths = rows
        .map((row) => row.actor_photo_path)
        .filter((path): path is string => Boolean(path));
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
    void load();

    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${uid}`,
        },
        () => { void load(); }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [uid, load]);

  const unread = items.filter((item) => !item.read_at).length;

  async function markRead(item: NotificationItem) {
    if (item.read_at) return;

    const { error: markError } = await supabase.rpc('mark_notification_read', {
      notification_id: item.id,
    });

    if (!markError) {
      setItems((current) => current.map((row) =>
        row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row
      ));
    }
  }

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void load();
        }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-royal"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="font-extrabold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">
                Likes and mutual matches
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="max-h-[min(65vh,480px)] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="p-5 text-sm text-slate-500" role="status">
                Loading notifications…
              </p>
            ) : error ? (
              <div className="p-4 text-sm text-rose-600">
                {error}
                <button type="button" onClick={() => void load()} className="ml-2 font-bold underline">
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="p-7 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 font-bold text-slate-800">You're all caught up</p>
                <p className="mt-1 text-xs text-slate-500">New likes and matches will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const isMatch = item.notification_type === 'match';
                  const destination = isMatch ? '/matches' : `/user/${item.actor_user_id}`;

                  return (
                    <li key={item.id}>
                      <Link
                        to={destination}
                        onClick={() => {
                          void markRead(item);
                          setOpen(false);
                        }}
                        className={`flex gap-3 px-4 py-3 transition hover:bg-blue-50 ${
                          item.read_at ? 'bg-white' : 'bg-blue-50/50'
                        }`}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          {item.photoUrl ? (
                            <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-slate-400">
                              {isMatch ? <MessageCircle className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-rose-500 text-white">
                            <Heart className="h-2.5 w-2.5" fill="currentColor" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-5 text-slate-800">
                            <strong>{item.actor_name}</strong>
                            {isMatch ? ' matched with you!' : ' liked your profile.'}
                          </p>
                          {item.like_comment && (
                            <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-600">
                              “{item.like_comment}”
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-slate-400">
                            {new Date(item.created_at).toLocaleString('en-IN')}
                          </p>
                        </div>
                        {!item.read_at && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

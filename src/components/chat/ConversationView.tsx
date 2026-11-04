
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import { Link, useNavigate } from 'react-router-dom';

import {
  ArrowLeft,
  BadgeCheck,
  MoreHorizontal,
  Send,
  AlertCircle,
  Smile,
  Search,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Settings,
  CheckCheck,
  X,
} from 'lucide-react';

import {
  fetchMessages,
  getConversation,
  markRead,
  getPeerReadAt,
  getPeerActivity,
  getConversationSettings,
  setConversationMuted,
  getVanishSettings,
  setVanishMode,
  sendMessage,
  SendError,
  PAGE,
  type ConversationHeader,
  type Msg,
  type VanishSettings,
} from '../../features/messaging/api';

import { signPhotoPaths } from '../../features/discovery/api';
import { supabase } from '../../lib/supabase';
import { unmatch } from '../../features/matches/api';

import {
  useMessageEvents,
  useRealtimeLive,
  useUserOnline,
  useChatPrivacy,
} from '../../features/messaging/ChatEvents';

import { ReportBlock } from '../discover/ReportBlock';
import { Modal } from '../ui/Modal';

type UIMsg = Msg & {
  status?: 'sending' | 'failed';
};

/* =====================================================
   MESSAGE HELPERS
===================================================== */

const merge = (a: UIMsg[], b: UIMsg[]) => {
  const map = new Map<string, UIMsg>();

  [...a, ...b].forEach((m) => {
    map.set(m.id, {
      ...map.get(m.id),
      ...m,
      status: m.status ?? undefined,
    });
  });

  return [...map.values()].sort((x, y) =>
    x.created_at.localeCompare(y.created_at)
  );
};

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });

/* =====================================================
   CONVERSATION VIEW
===================================================== */

export function ConversationView({
  id,
  uid,
  onRead,
}: {
  id: string;
  uid: string;
  onRead: () => void;
}) {
  const nav = useNavigate();
  const live = useRealtimeLive();
  const { privacy } = useChatPrivacy();

  const [head, setHead] = useState<
    ConversationHeader | null | undefined
  >(undefined);

  // Actual presence status of the other user.
  // This is not hardcoded.
  const isOnline = useUserOnline(head?.user_id);

  const [msgs, setMsgs] = useState<UIMsg[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [unmatchOpen, setUnmatchOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
  const [peerActivity, setPeerActivity] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [vanish, setVanish] = useState<VanishSettings>({ enabled: false, enabled_by: null, enabled_at: null });
  const [menuSearch, setMenuSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const loadVersion = useRef(0);

  /* =====================================================
     READ RECEIPTS
  ===================================================== */

  const read = useCallback(() => {
    if (document.visibilityState !== 'visible') return;

    void Promise.resolve(markRead(id))
      .then(() => onRead())
      .catch(() => {
        // Read receipts should not block the chat.
      });
  }, [id, onRead]);

  /* =====================================================
     RECEIPTS, ACTIVITY AND CONVERSATION PREFERENCES
  ===================================================== */

  const refreshConversationMeta = useCallback(async () => {
    if (!privacy.read_receipts_enabled) setPeerReadAt(null);
    else setPeerReadAt(await getPeerReadAt(id));

    if (!privacy.activity_status_enabled) setPeerActivity(null);
    else setPeerActivity(await getPeerActivity(id));

    const [conversationSettings, vanishSettings] = await Promise.all([
      getConversationSettings(id),
      getVanishSettings(id),
    ]);
    setMuted(conversationSettings.notifications_muted);
    setVanish(vanishSettings);
  }, [id, privacy.read_receipts_enabled, privacy.activity_status_enabled]);

  useEffect(() => {
    void refreshConversationMeta().catch((e) => console.error('Chat settings refresh failed:', e));
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshConversationMeta().catch(() => {});
      }
    }, 10000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshConversationMeta().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshConversationMeta]);

  async function toggleMute() {
    setActionBusy(true);
    try {
      await setConversationMuted(id, !muted);
      setMuted(!muted);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  }

  async function toggleVanish() {
    const next = !vanish.enabled;
    const confirmed = window.confirm(
      next
        ? 'Enable Vanish Mode for both people? New messages will expire after 24 hours.'
        : 'Turn off Vanish Mode? New messages will no longer expire automatically.'
    );
    if (!confirmed) return;
    setActionBusy(true);
    try {
      await setVanishMode(id, next);
      await refreshConversationMeta();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setActionBusy(false);
    }
  }

  const activityLabel = isOnline
    ? 'Online'
    : peerActivity
      ? (() => {
          const minutes = Math.max(0, Math.floor((Date.now() - new Date(peerActivity).getTime()) / 60000));
          return minutes < 1 ? 'Active now' : `Active ${minutes} min ago`;
        })()
      : 'Offline';

  /* =====================================================
     FAST CONVERSATION LOADING
  ===================================================== */

  const load = useCallback(async () => {
    const version = ++loadVersion.current;

    setErr(null);
    setSendErr(null);
    setLoading(true);
    setHead(undefined);
    setMsgs([]);
    setHasMore(false);
    setMenu(false);

    stick.current = true;

    const headerTask = getConversation(id)
      .then((h) => {
        if (version !== loadVersion.current) return;

        setHead(h);
        setLoading(false);

        if (h?.is_open) {
          read();
        }

        if (h?.photo_path) {
          void signPhotoPaths([h.photo_path])
            .then((urls) => {
              if (version !== loadVersion.current) return;

              setHead((current) => {
                if (
                  !current ||
                  current.conversation_id !== id
                ) {
                  return current;
                }

                return {
                  ...current,
                  photoUrl: urls[h.photo_path!] ?? null,
                };
              });
            })
            .catch(() => {
              // A missing photo must not block messaging.
            });
        }
      })
      .catch((e) => {
        if (version !== loadVersion.current) return;

        setErr((e as Error).message);
        setLoading(false);
      });

    const messagesTask = fetchMessages(id)
      .then((m) => {
        if (version !== loadVersion.current) return;

        setMsgs(m);
        setHasMore(m.length === PAGE);
        stick.current = true;
      })
      .catch((e) => {
        if (version !== loadVersion.current) return;

        setErr((e as Error).message);
      });

    await Promise.allSettled([
      headerTask,
      messagesTask,
    ]);
  }, [id, read]);

  /* =====================================================
     INITIAL LOAD AND CLEANUP
  ===================================================== */

  useEffect(() => {
    void load();

    return () => {
      loadVersion.current++;
    };
  }, [load]);

  /* =====================================================
     AUTO SCROLL
  ===================================================== */

  useEffect(() => {
    if (stick.current) {
      bottom.current?.scrollIntoView({
        block: 'end',
        behavior: 'smooth',
      });
    }
  }, [msgs]);

  /* =====================================================
     REALTIME MESSAGES
  ===================================================== */

  useMessageEvents((m) => {
    if (m.conversation_id !== id) return;

    stick.current = true;

    setMsgs((current) => merge(current, [m]));

    if (m.sender_user_id !== uid) {
      read();
    }
  });

  /* =====================================================
     FALLBACK POLLING
  ===================================================== */

  useEffect(() => {
    if (live || !head?.is_open) return;

    let cancelled = false;

    const t = window.setInterval(() => {
      void fetchMessages(id)
        .then((m) => {
          if (cancelled) return;

          setMsgs((current) => merge(current, m));
          read();
        })
        .catch(() => {
          // Temporary network errors should not break the chat.
        });
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [live, head?.is_open, id, read]);

  /* =====================================================
     LOAD OLDER MESSAGES
  ===================================================== */

  async function loadEarlier() {
    if (!msgs.length || !hasMore) return;

    try {
      stick.current = false;

      const older = await fetchMessages(
        id,
        msgs[0].created_at
      );

      setMsgs((current) => merge(older, current));
      setHasMore(older.length === PAGE);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  /* =====================================================
     SEND MESSAGE
  ===================================================== */

  async function deliver(m: UIMsg) {
    setMsgs((current) =>
      current.map((x) =>
        x.id === m.id
          ? { ...x, status: 'sending' }
          : x
      )
    );

    try {
      await sendMessage(
        m.id,
        id,
        uid,
        m.content
      );

      setMsgs((current) =>
        current.map((x) =>
          x.id === m.id
            ? { ...x, status: undefined }
            : x
        )
      );

      setSendErr(null);
    } catch (e) {
      const se = e as SendError;

      if (se.duplicate) {
        setMsgs((current) =>
          current.map((x) =>
            x.id === m.id
              ? { ...x, status: undefined }
              : x
          )
        );

        setSendErr(null);
        return;
      }

      if (se.closed) {
        setHead((current) =>
          current
            ? { ...current, is_open: false }
            : current
        );

        setMsgs((current) =>
          current.filter((x) => x.id !== m.id)
        );
      } else {
        setMsgs((current) =>
          current.map((x) =>
            x.id === m.id
              ? { ...x, status: 'failed' }
              : x
          )
        );
      }

      setSendErr(se.message);
    }
  }

  /* =====================================================
     SUBMIT MESSAGE
  ===================================================== */

  function submit(e?: FormEvent) {
    e?.preventDefault();

    const content = text.trim();

    if (!content) return;

    setText('');
    stick.current = true;

    const m: UIMsg = {
      id: crypto.randomUUID(),
      sender_user_id: uid,
      content,
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setMsgs((current) => merge(current, [m]));

    void deliver(m);
  }

  /* =====================================================
     EMOJI INSERTION
  ===================================================== */

  function insertEmoji() {
    const emoji = '😊';

    setText((current) => current + emoji);
    textarea.current?.focus();
  }

  /* =====================================================
     ENTER TO SEND
  ===================================================== */

  function handleKeyDown(
    e: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  /* =====================================================
     UNMATCH
  ===================================================== */

  async function doUnmatch() {
    setBusy(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('match_id')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error('Could not unmatch. Try again.');
      }

      await unmatch(data.match_id as string);

      nav('/inbox');
    } catch (e) {
      setErr((e as Error).message);
      setUnmatchOpen(false);
    } finally {
      setBusy(false);
    }
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-[#03060d]">
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <div className="h-12 w-12 animate-pulse rounded-full bg-slate-800" />

          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
            <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-4 p-5">
          <div className="h-14 w-40 animate-pulse self-start rounded-2xl bg-slate-800" />
          <div className="h-14 w-52 animate-pulse self-end rounded-2xl bg-blue-900/50" />
        </div>
      </div>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (err && !head) {
    return (
      <div className="grid h-full w-full place-items-center bg-[#03060d] p-6 text-center">
        <div>
          <p className="text-red-400" role="alert">
            {err}
          </p>

          <button
            className="mt-4 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* =====================================================
     CLOSED CONVERSATION
  ===================================================== */

  if (!head || !head.is_open) {
    return (
      <div className="grid h-full w-full place-items-center bg-[#03060d] p-6 text-center">
        <div>
          <p className="font-bold text-white">
            This conversation is no longer available.
          </p>

          <p className="mt-2 text-slate-400">
            The match may have ended.
          </p>

          <Link
            to="/inbox"
            className="mt-5 inline-block rounded-xl border border-blue-500/40 px-5 py-3 font-semibold text-blue-300 hover:bg-blue-500/10"
          >
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN PREMIUM CHAT UI
  ===================================================== */

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#03060d] text-white">

      {/* SUBTLE BLUE AMBIENT LIGHT */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-36 top-24 h-72 w-72 rounded-full bg-blue-700/10 blur-[110px]" />
        <div className="absolute -bottom-40 -right-36 h-96 w-96 rounded-full bg-blue-700/15 blur-[120px]" />
      </div>

      {/* CHAT HEADER */}

      <header className="relative z-10 flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.09] bg-[#050912]/95 px-3 sm:px-5">

        <Link
          to="/inbox"
          aria-label="Back to messages"
          className="grid h-10 w-9 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/10 md:hidden"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <Link
          to={`/user/${head.user_id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label={`View ${head.display_name}'s profile`}
        >
          {head.photoUrl ? (
            <img
              src={head.photoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full border-2 border-blue-500 object-cover shadow-[0_0_16px_rgba(0,105,255,0.35)]"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-blue-500/60 bg-slate-800 text-lg font-bold text-white">
              {head.display_name?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          )}

          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[16px] font-bold tracking-tight text-white sm:text-lg">
                {head.display_name}
              </span>

              {head.verified && (
                <BadgeCheck
                  className="h-5 w-5 shrink-0 fill-blue-500 text-blue-500"
                  aria-label="Verified"
                />
              )}
            </span>

            {/* REAL PRESENCE STATUS */}

            <span className="mt-0.5 flex items-center gap-1.5 text-xs sm:text-sm">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                    : 'bg-slate-500'
                }`}
              />

              <span
                className={
                  isOnline
                    ? 'font-medium text-emerald-400'
                    : 'text-slate-400'
                }
              >
                {privacy.activity_status_enabled ? activityLabel : ''}
              </span>
            </span>
          </span>
        </Link>

        <button
          type="button"
          aria-label="More options"
          aria-expanded={menu}
          onClick={() => setMenu((current) => !current)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <MoreHorizontal className="h-6 w-6" />
        </button>
      </header>

      {/* CHAT MENU */}
      {menu && (
        <div className="relative z-20 shrink-0 space-y-2 border-b border-white/10 bg-[#090f1c] p-4">
          <Link to={`/user/${head.user_id}`} onClick={() => setMenu(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white hover:bg-white/10">
            <BadgeCheck className="h-4 w-4 text-blue-400" /> View Profile
          </Link>
          <button type="button" onClick={() => setMenuSearch((v) => !v)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white hover:bg-white/10">
            <Search className="h-4 w-4" /> Search in Chat
          </button>
          {menuSearch && (
            <div className="flex items-center gap-2 px-2">
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search messages..." className="field min-w-0 flex-1" />
              <button type="button" aria-label="Clear search" onClick={() => { setSearchTerm(''); setMenuSearch(false); }} className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
          )}
          <button type="button" disabled={actionBusy} onClick={() => void toggleMute()} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50">
            {muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {muted ? 'Unmute Notifications' : 'Mute Notifications'}
          </button>
          <button type="button" disabled={actionBusy} onClick={() => void toggleVanish()} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50">
            {vanish.enabled ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4" />}
            {vanish.enabled ? 'Turn Off Vanish Mode' : 'Enable Vanish Mode'}
          </button>
          <Link to="/settings/privacy" onClick={() => setMenu(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white hover:bg-white/10">
            <Settings className="h-4 w-4" /> Chat Settings / Privacy
          </Link>
          <div className="border-t border-white/10 pt-2">
            <ReportBlock uid={uid} targetId={head.user_id!} name={head.display_name!} onBlocked={() => nav('/inbox')} />
            <div className="text-center">
              <button className="text-sm font-medium text-red-400 underline underline-offset-4" onClick={() => setUnmatchOpen(true)}>Unmatch</button>
            </div>
          </div>
          {vanish.enabled && <p className="px-3 text-xs text-emerald-300">Vanish Mode is on. New messages expire after 24 hours.</p>}
          {muted && <p className="px-3 text-xs text-slate-400">Notifications are muted for this conversation on your account.</p>}
        </div>
      )}

      {/* MESSAGES AREA */}

      <div
        className="
          relative z-0
          min-h-0 flex-1
          space-y-2
          overflow-y-auto
          overscroll-contain
          px-4 py-4
          sm:px-6
        "
        aria-live="polite"
      >
        {hasMore && (
          <button
            className="mx-auto mb-4 block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20"
            onClick={loadEarlier}
          >
            Load earlier messages
          </button>
        )}

        {msgs.length === 0 && !err && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Smile className="h-8 w-8" />
            </div>

            <p className="font-semibold text-white">
              You matched with {head.display_name}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Start a conversation. Say hello!
            </p>
          </div>
        )}

        {msgs.filter((m) => !searchTerm.trim() || m.content.toLowerCase().includes(searchTerm.trim().toLowerCase())).map((m, i, visibleMsgs) => {
          const mine = m.sender_user_id === uid;

          const newDay =
            i === 0 ||
            new Date(m.created_at).toDateString() !==
              new Date(visibleMsgs[i - 1].created_at).toDateString();

          return (
            <div key={m.id}>
              {newDay && (
                <div className="my-5 flex justify-center">
                  <span className="rounded-full border border-white/10 bg-slate-900/80 px-4 py-1.5 text-xs font-medium text-slate-400 shadow-lg">
                    {dayLabel(m.created_at)}
                  </span>
                </div>
              )}

              <div
                className={`flex w-full ${
                  mine ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`
                    max-w-[82%]
                    break-words
                    whitespace-pre-wrap
                    rounded-[20px]
                    px-4 py-3
                    text-[15px]
                    leading-relaxed
                    shadow-lg
                    sm:max-w-[70%]
                    ${
                      mine
                        ? 'rounded-br-md bg-gradient-to-br from-[#087bff] to-[#0755d8] text-white shadow-blue-950/30'
                        : 'rounded-bl-md border border-white/[0.07] bg-[#141b29] text-slate-100 shadow-black/20'
                    }
                    ${
                      m.status === 'sending'
                        ? 'opacity-60'
                        : ''
                    }
                  `}
                >
                  {m.content}
                </div>
              </div>

              <p
                className={`mt-1 flex items-center gap-1.5 px-1 text-[11px] text-slate-500 ${
                  mine ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.status === 'sending' ? (
                  'Sending…'
                ) : m.status === 'failed' ? (
                  <>
                    <AlertCircle
                      className="h-3.5 w-3.5 text-red-400"
                      aria-hidden
                    />

                    <span className="text-red-400">
                      Not sent.
                    </span>

                    <button
                      className="font-semibold text-blue-400 underline"
                      onClick={() => void deliver(m)}
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  <>
                    {timeLabel(m.created_at)}
                    {mine && privacy.read_receipts_enabled && peerReadAt && new Date(peerReadAt).getTime() >= new Date(m.created_at).getTime() && (
                      <CheckCheck className="h-4 w-4 text-emerald-400" aria-label="Read" />
                    )}
                  </>
                )}
              </p>
            </div>
          );
        })}

        <div ref={bottom} />
      </div>

      {/* PREMIUM FULL-WIDTH MESSAGE COMPOSER */}

      <div className="relative z-10 shrink-0 border-t border-white/[0.08] bg-[#050912]/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5">

        {(sendErr || err) && (
          <p
            role="alert"
            className="mb-2 px-2 text-xs text-red-400"
          >
            {sendErr ?? err}
          </p>
        )}

        <form
          onSubmit={submit}
          className="flex w-full items-center gap-2.5"
        >
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-slate-700/80 bg-[#0b1220] px-4 shadow-[0_0_18px_rgba(0,83,255,0.08)] transition focus-within:border-blue-500/70 focus-within:shadow-[0_0_20px_rgba(0,105,255,0.14)]">

            <textarea
              ref={textarea}
              className="
                min-h-[52px]
                max-h-32
                min-w-0
                flex-1
                resize-none
                bg-transparent
                py-3.5
                text-[15px]
                leading-6
                text-white
                outline-none
                placeholder:text-slate-500
              "
              rows={1}
              maxLength={2000}
              placeholder="Write a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button
              type="button"
              onClick={insertEmoji}
              aria-label="Insert emoji"
              className="ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-blue-400"
            >
              <Smile className="h-6 w-6" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Send message"
            className="
              grid h-[54px] w-[54px]
              shrink-0
              place-items-center
              rounded-full
              bg-gradient-to-br
              from-[#087bff]
              to-[#064fdb]
              text-white
              shadow-[0_0_20px_rgba(0,100,255,0.30)]
              transition-all duration-200
              hover:scale-[1.04]
              hover:shadow-[0_0_25px_rgba(0,100,255,0.45)]
              active:scale-95
              disabled:cursor-not-allowed
              disabled:opacity-40
              disabled:shadow-none
            "
          >
            <Send className="h-6 w-6" />
          </button>
        </form>
      </div>

      {/* UNMATCH MODAL */}

      <Modal
        open={unmatchOpen}
        onClose={() => setUnmatchOpen(false)}
        title={`Unmatch ${head.display_name}?`}
      >
        <p className="text-slate2">
          This ends the conversation for both of you and hides the message history. It cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            className="btn-outline flex-1"
            onClick={() => setUnmatchOpen(false)}
          >
            Cancel
          </button>

          <button
            className="btn-primary flex-1"
            disabled={busy}
            onClick={doUnmatch}
          >
            {busy ? 'Unmatching…' : 'Unmatch'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

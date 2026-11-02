
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  MoreHorizontal,
  Send,
  AlertCircle,
} from 'lucide-react';

import {
  fetchMessages,
  getConversation,
  markRead,
  sendMessage,
  SendError,
  PAGE,
  type ConversationHeader,
  type Msg,
} from '../../features/messaging/api';

import { signPhotoPaths } from '../../features/discovery/api';
import { supabase } from '../../lib/supabase';
import { unmatch } from '../../features/matches/api';

import {
  useMessageEvents,
  useRealtimeLive,
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

  const [head, setHead] = useState<
    ConversationHeader | null | undefined
  >(undefined);

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
  const loadVersion = useRef(0);

  /* READ RECEIPTS */

  const read = useCallback(() => {
    if (document.visibilityState !== 'visible') return;

    void Promise.resolve(markRead(id))
      .then(() => onRead())
      .catch(() => {
        // Read receipts should not block the chat.
      });
  }, [id, onRead]);

  /* FAST CONVERSATION LOADING */

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

  /* INITIAL LOAD AND CLEANUP */

  useEffect(() => {
    void load();

    return () => {
      loadVersion.current++;
    };
  }, [load]);

  /* AUTO SCROLL */

  useEffect(() => {
    if (stick.current) {
      bottom.current?.scrollIntoView({
        block: 'end',
        behavior: 'auto',
      });
    }
  }, [msgs]);

  /* REALTIME MESSAGES */

  useMessageEvents((m) => {
    if (m.conversation_id !== id) return;

    stick.current = true;

    setMsgs((current) => merge(current, [m]));

    if (m.sender_user_id !== uid) {
      read();
    }
  });

  /* FALLBACK POLLING */

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

  /* LOAD OLDER MESSAGES */

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

  /* SEND MESSAGE */

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

  /* SUBMIT MESSAGE */

  function submit(e?: React.FormEvent) {
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

  /* UNMATCH */

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

  /* LOADING */

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-line p-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-mist" />
          <div className="h-4 w-32 animate-pulse rounded bg-mist" />
        </div>

        <div className="flex flex-1 flex-col justify-end gap-4 p-4">
          <div className="h-10 w-40 animate-pulse self-start rounded-2xl bg-mist" />
          <div className="h-10 w-52 animate-pulse self-end rounded-2xl bg-mist" />
          <div className="h-10 w-32 animate-pulse self-start rounded-2xl bg-mist" />
        </div>
      </div>
    );
  }

  /* ERROR */

  if (err && !head) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="text-bad" role="alert">
            {err}
          </p>

          <button
            className="btn-primary mt-4"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* CLOSED CONVERSATION */

  if (!head || !head.is_open) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        <div>
          <p className="font-bold">
            This conversation is no longer available.
          </p>

          <p className="mt-1 text-slate2">
            The match may have ended.
          </p>

          <Link
            to="/inbox"
            className="btn-outline mt-4"
          >
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  /* MAIN CHAT UI */

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* CHAT HEADER */}

      <header className="flex shrink-0 items-center gap-3 border-b border-line p-3">
        <Link
          to="/inbox"
          aria-label="Back to messages"
          className="md:hidden"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <Link
          to={`/user/${head.user_id}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
          aria-label={`View ${head.display_name}'s profile`}
        >
          {head.photoUrl ? (
            <img
              src={head.photoUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="h-10 w-10 rounded-full bg-mist" />
          )}

          <span className="flex min-w-0 items-center gap-1 font-extrabold">
            <span className="truncate">
              {head.display_name}
            </span>

            {head.verified && (
              <BadgeCheck
                className="h-5 w-5 shrink-0 text-royal"
                aria-label="Verified"
              />
            )}
          </span>
        </Link>

        <button
          aria-label="More options"
          aria-expanded={menu}
          onClick={() => setMenu((current) => !current)}
          className="rounded-lg p-2 hover:bg-mist"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      {/* CHAT MENU */}

      {menu && (
        <div className="shrink-0 space-y-3 border-b border-line bg-mist p-3">
          <ReportBlock
            uid={uid}
            targetId={head.user_id!}
            name={head.display_name!}
            onBlocked={() => nav('/inbox')}
          />

          <div className="text-center">
            <button
              className="text-sm text-slate2 underline"
              onClick={() => setUnmatchOpen(true)}
            >
              Unmatch
            </button>
          </div>
        </div>
      )}

      {/* MESSAGES */}

      <div
        className="
          min-h-0 flex-1
          space-y-1 overflow-y-auto
          p-3
          pb-28
          md:pb-3
        "
        aria-live="polite"
      >
        {hasMore && (
          <button
            className="mx-auto block text-sm font-semibold text-royal"
            onClick={loadEarlier}
          >
            Load earlier messages
          </button>
        )}

        {msgs.length === 0 && !err && (
          <p className="mt-10 text-center text-slate2">
            You matched with {head.display_name}. Say hello.
          </p>
        )}

        {msgs.map((m, i) => {
          const mine = m.sender_user_id === uid;

          const newDay =
            i === 0 ||
            new Date(m.created_at).toDateString() !==
              new Date(msgs[i - 1].created_at).toDateString();

          return (
            <div key={m.id}>
              {newDay && (
                <p className="my-3 text-center text-xs text-slate2">
                  {dayLabel(m.created_at)}
                </p>
              )}

              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 ${
                    mine
                      ? 'bg-royal text-white'
                      : 'bg-mist'
                  } ${
                    m.status === 'sending'
                      ? 'opacity-60'
                      : ''
                  }`}
                >
                  {m.content}
                </div>
              </div>

              <p
                className={`mt-0.5 flex items-center gap-1 text-xs text-slate2 ${
                  mine ? 'justify-end' : ''
                }`}
              >
                {m.status === 'sending' ? (
                  'Sending…'
                ) : m.status === 'failed' ? (
                  <>
                    <AlertCircle
                      className="h-3.5 w-3.5 text-bad"
                      aria-hidden
                    />

                    <span className="text-bad">
                      Not sent.
                    </span>

                    <button
                      className="underline"
                      onClick={() => void deliver(m)}
                    >
                      Retry
                    </button>
                  </>
                ) : (
                  timeLabel(m.created_at)
                )}
              </p>
            </div>
          );
        })}

        <div ref={bottom} />
      </div>

      {/* MESSAGE COMPOSER */}

      <div
        className="
          fixed inset-x-6
          bottom-[calc(4.5rem+env(safe-area-inset-bottom))]
          z-30
          rounded-2xl
          border border-line
          bg-white
          p-2
          shadow-[0_-4px_16px_rgba(15,23,42,0.06)]
          md:static md:z-auto
          md:shrink-0
          md:rounded-none
          md:border-x-0 md:border-b-0
          md:border-t
          md:bg-white
          md:p-3
          md:shadow-none
        "
      >
        {(sendErr || err) && (
          <p
            role="alert"
            className="mb-1 px-2 text-sm text-bad"
          >
            {sendErr ?? err}
          </p>
        )}

        <form
          onSubmit={submit}
          className="flex w-full items-end gap-2"
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">
              Message
            </span>

            <textarea
              className="
                field
                min-h-[54px]
                max-h-32
                w-full
                resize-none
                py-3
              "
              rows={1}
              maxLength={2000}
              placeholder="Write a message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </label>

          <button
            type="submit"
            className="
              btn-primary
              grid h-[54px] w-[58px]
              shrink-0 place-items-center
              px-3
            "
            disabled={!text.trim()}
            aria-label="Send message"
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

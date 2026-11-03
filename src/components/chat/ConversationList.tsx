
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, MessageCircle } from 'lucide-react';

import type { ConversationItem } from '../../features/messaging/api';

/* =====================================================
   DATE / TIME FORMATTER
===================================================== */

const when = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();

  if (Number.isNaN(date.getTime())) return '';

  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
};

/* =====================================================
   CONVERSATION LIST
===================================================== */

export function ConversationList({
  items,
  uid,
  loading,
  error,
  onRetry,
}: {
  items: ConversationItem[];
  uid: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [q, setQ] = useState('');

  const shown = items.filter((item) =>
    item.display_name
      .toLowerCase()
      .includes(q.trim().toLowerCase())
  );

  return (
    <div
      className="
        flex h-full min-h-0 w-full
        flex-col overflow-hidden
        bg-[#050912] text-white
        [color-scheme:dark]
      "
    >
      {/* =============================================
          HEADER
      ============================================= */}

      <header
        className="
          shrink-0
          border-b border-white/[0.08]
          bg-[#050912]
          px-4 pb-4 pt-5
          sm:px-5
        "
      >
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Messages
          </h1>

          <MessageCircle
            className="h-5 w-5 text-blue-400"
            aria-hidden
          />
        </div>

        {/* SEARCH */}

        <label className="relative block">
          <span className="sr-only">
            Search conversations
          </span>

          <Search
            className="
              absolute left-4 top-1/2
              h-5 w-5 -translate-y-1/2
              text-slate-400
            "
            aria-hidden
          />

          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name"
            className="
              block h-12 w-full
              rounded-xl
              !border !border-slate-700/80
              !bg-[#0b1220]
              pl-11 pr-4
              !text-white
              !shadow-none
              outline-none
              placeholder:!text-slate-500
              transition
              focus:!border-blue-500
              focus:!ring-2
              focus:!ring-blue-500/20
            "
          />
        </label>
      </header>

      {/* =============================================
          CONVERSATION CONTENT
      ============================================= */}

      <div
        className="
          min-h-0 flex-1
          overflow-y-auto
          overscroll-contain
          bg-[#050912]
        "
      >
        {/* LOADING */}

        {loading && (
          <div
            className="space-y-4 p-5"
            role="status"
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex animate-pulse items-center gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-slate-800" />

                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 rounded bg-slate-800" />
                  <div className="h-3 w-40 rounded bg-slate-800" />
                </div>
              </div>
            ))}

            <span className="sr-only">
              Loading conversations…
            </span>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="p-5">
            <p
              className="text-sm text-red-400"
              role="alert"
            >
              {error}
            </p>

            <button
              type="button"
              className="
                mt-3 text-sm font-semibold
                text-blue-400 underline
                underline-offset-4
              "
              onClick={onRetry}
            >
              Retry
            </button>
          </div>
        )}

        {/* EMPTY STATE */}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div
              className="
                mb-5 grid h-16 w-16 place-items-center
                rounded-full
                border border-blue-500/20
                bg-blue-500/10
              "
            >
              <MessageCircle className="h-7 w-7 text-blue-400" />
            </div>

            <h2 className="font-semibold text-white">
              No conversations yet
            </h2>

            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
              Match with someone in Discover, then say hello.
            </p>
          </div>
        )}

        {/* NO SEARCH RESULTS */}

        {!loading &&
          !error &&
          items.length > 0 &&
          shown.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Search className="mx-auto mb-3 h-7 w-7 text-slate-600" />

              <p className="text-sm text-slate-400">
                No one matches “{q}”.
              </p>
            </div>
          )}

        {/* ===========================================
            CONVERSATION ROWS
        =========================================== */}

        {!loading && !error && shown.length > 0 && (
          <ul className="m-0 list-none divide-y divide-white/[0.06] p-0">
            {shown.map((c) => (
              <li
                key={c.conversation_id}
                className="m-0 bg-[#050912] p-0"
              >
                <NavLink
                  to={`/chat/${c.conversation_id}`}
                  className={({ isActive }) =>
                    [
                      // Base layout
                      'relative flex w-full items-center gap-3',
                      'px-4 py-4 sm:px-5',
                      'border-0 border-b border-solid border-white/[0.04]',
                      'no-underline outline-none',
                      'transition-colors duration-200',

                      // Force text and background against global CSS
                      '!text-white',

                      // Active and inactive backgrounds
                      isActive
                        ? '!bg-[#0b1b35] shadow-[inset_0_0_24px_rgba(0,100,255,0.08)]'
                        : '!bg-[#050912] hover:!bg-[#0a1425]',

                      // Keyboard accessibility
                      'focus-visible:!bg-[#102344]',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* ACTIVE BLUE INDICATOR */}

                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="
                            absolute bottom-0 left-0 top-0
                            w-[3px]
                            rounded-r-full
                            bg-blue-500
                            shadow-[0_0_12px_rgba(0,110,255,0.8)]
                          "
                        />
                      )}

                      {/* PROFILE IMAGE */}

                      <div className="relative shrink-0">
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt=""
                            loading="lazy"
                            className={`
                              h-[54px] w-[54px]
                              rounded-full
                              object-cover
                              ${
                                isActive
                                  ? 'border-2 border-blue-500 shadow-[0_0_12px_rgba(0,100,255,0.25)]'
                                  : 'border border-slate-700'
                              }
                            `}
                          />
                        ) : (
                          <div
                            className="
                              grid h-[54px] w-[54px]
                              place-items-center
                              rounded-full
                              border border-slate-700
                              bg-[#17243a]
                              text-lg font-bold
                              text-blue-300
                            "
                          >
                            {c.display_name
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* NAME AND MESSAGE PREVIEW */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`
                              min-w-0 truncate
                              text-[15px]
                              ${
                                c.unread_count > 0
                                  ? 'font-extrabold !text-white'
                                  : 'font-semibold !text-slate-100'
                              }
                            `}
                          >
                            {c.display_name}
                          </span>

                          <span
                            className="
                              shrink-0
                              text-[11px]
                              font-medium
                              !text-slate-500
                            "
                          >
                            {when(
                              c.last_message_at ?? c.matched_at
                            )}
                          </span>
                        </div>

                        <p
                          className={`
                            mb-0 mt-1
                            block truncate
                            text-sm
                            ${
                              c.unread_count > 0
                                ? '!font-semibold !text-blue-300'
                                : '!font-normal !text-slate-400'
                            }
                          `}
                        >
                          {c.last_message
                            ? `${
                                c.last_sender_id === uid
                                  ? 'You: '
                                  : ''
                              }${c.last_message}`
                            : 'New match. Say hello.'}
                        </p>
                      </div>

                      {/* UNREAD COUNT */}

                      {c.unread_count > 0 && (
                        <span
                          className="
                            grid h-6 min-w-6 shrink-0
                            place-items-center
                            rounded-full
                            bg-blue-600
                            px-1.5
                            text-xs font-bold
                            text-white
                            shadow-[0_0_10px_rgba(0,100,255,0.35)]
                          "
                          aria-label={`${c.unread_count} unread`}
                        >
                          {c.unread_count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

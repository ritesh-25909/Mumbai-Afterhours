
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthProvider';
import {
  listConversations,
  type ConversationItem,
} from '../features/messaging/api';

import { useMessageEvents } from '../features/messaging/ChatEvents';
import { ConversationList } from '../components/chat/ConversationList';
import { ConversationView } from '../components/chat/ConversationView';

// Session-memory cache, separated by authenticated user.
const conversationCache = new Map<string, ConversationItem[]>();

export default function ChatPage() {
  const { id } = useParams();
  const { session } = useAuth();

  const uid = session!.user.id;

  const [items, setItems] = useState<ConversationItem[]>(
    () => conversationCache.get(uid) ?? []
  );

  const [loading, setLoading] = useState(
    () => !conversationCache.has(uid)
  );

  const [error, setError] = useState<string | null>(null);

  const timer = useRef<number | undefined>(undefined);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;

    if (!conversationCache.has(uid)) {
      setLoading(true);
    }

    try {
      const rows = await listConversations((updated) => {
        if (version !== requestVersion.current) return;

        conversationCache.set(uid, updated);
        setItems(updated);
      });

      if (version !== requestVersion.current) return;

      conversationCache.set(uid, rows);
      setItems(rows);
      setError(null);
    } catch (e) {
      if (version !== requestVersion.current) return;

      setError((e as Error).message);
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [uid]);

  useEffect(() => {
    void load();

    return () => {
      requestVersion.current++;
    };
  }, [load]);

  const reloadSoon = useCallback(() => {
    window.clearTimeout(timer.current);

    timer.current = window.setTimeout(() => {
      void load();
    }, 300);
  }, [load]);

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
    };
  }, []);

  useMessageEvents(reloadSoon);

  return (
    <div
      className="
        flex h-full min-h-0 w-full
        overflow-hidden
        bg-[#03060d] text-white
      "
    >
      {/* DESKTOP CONVERSATION LIST */}

      <section
        className={`
          ${id ? 'hidden md:flex' : 'flex'}
          w-full md:w-[340px]
          md:shrink-0
          flex-col
          overflow-hidden
          border-r border-white/[0.08]
          bg-[#050912]
        `}
        aria-label="Conversations"
      >
        <ConversationList
          items={items}
          uid={uid}
          loading={loading}
          error={error}
          onRetry={load}
        />
      </section>

      {/* ACTIVE CONVERSATION */}

      <section
        className={`
          ${id ? 'flex' : 'hidden md:flex'}
          min-w-0 flex-1
          flex-col
          overflow-hidden
          bg-[#03060d]
        `}
        aria-label="Conversation"
      >
        {id ? (
          <ConversationView
            key={id}
            id={id}
            uid={uid}
            onRead={reloadSoon}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-[#03060d] px-6 text-center">
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-9 w-9"
              >
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-white">
              Your conversations
            </h2>

            <p className="mt-2 max-w-sm text-sm text-slate-400">
              Select a conversation to start connecting.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

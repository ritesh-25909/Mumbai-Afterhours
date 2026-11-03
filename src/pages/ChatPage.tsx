
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
    return () => window.clearTimeout(timer.current);
  }, []);

  useMessageEvents(reloadSoon);

  return (
    <div
      className={
        id
          ? `
            relative
            -mx-4 -my-5
            h-[calc(100dvh-4.5rem-env(safe-area-inset-bottom))]
            w-[calc(100%+2rem)]
            overflow-hidden
            bg-[#03060d]
            text-white

            sm:-mx-6
            sm:w-[calc(100%+3rem)]

            md:mx-0 md:my-0
            md:h-[calc(100dvh-3rem)]
            md:w-full
            md:rounded-2xl
            md:border md:border-slate-800
          `
          : `
            card
            flex
            h-[calc(100dvh-10.5rem)]
            overflow-hidden
            md:h-[calc(100dvh-3rem)]
          `
      }
    >

      {/* CONVERSATION LIST */}

      <section
        className={`
          ${id ? 'hidden md:block' : 'block'}
          w-full
          border-r border-slate-800
          bg-[#050912]
          md:w-80
          md:shrink-0
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
          ${id ? 'block' : 'hidden md:grid'}
          min-w-0
          flex-1
          place-items-center
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
          <p className="text-slate2">
            Select a conversation.
          </p>
        )}
      </section>
    </div>
  );
}

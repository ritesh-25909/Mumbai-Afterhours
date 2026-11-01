
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthProvider';
import {
  listConversations,
  type ConversationItem
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

    // Only show loading when there is no cached content.
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
    <div className="card flex h-[calc(100dvh-10.5rem)] overflow-hidden md:h-[calc(100dvh-3rem)]">

      <section
        className={`${id ? 'hidden md:block' : 'block'} w-full border-r border-line md:w-80 md:shrink-0`}
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

      <section
        className={`${id ? 'block' : 'hidden md:grid'} min-w-0 flex-1 place-items-center`}
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

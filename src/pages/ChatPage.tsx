import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';
import { listConversations, type ConversationItem } from '../features/messaging/api';
import { useMessageEvents } from '../features/messaging/ChatEvents';
import { ConversationList } from '../components/chat/ConversationList';
import { ConversationView } from '../components/chat/ConversationView';

// Desktop: list and conversation side by side. Mobile: one pane at a time, driven by the URL.
export default function ChatPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const uid = session!.user.id;
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number>();

  const load = useCallback(async () => {
    try { setItems(await listConversations()); setError(null); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const reloadSoon = useCallback(() => { window.clearTimeout(timer.current); timer.current = window.setTimeout(load, 300); }, [load]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useMessageEvents(reloadSoon);

  return (
    <div className="card flex h-[calc(100dvh-10.5rem)] overflow-hidden md:h-[calc(100dvh-3rem)]">
      <section className={`${id ? 'hidden md:block' : 'block'} w-full border-r border-line md:w-80 md:shrink-0`} aria-label="Conversations">
        <ConversationList items={items} uid={uid} loading={loading} error={error} onRetry={load} />
      </section>
      <section className={`${id ? 'block' : 'hidden md:grid'} min-w-0 flex-1 place-items-center`} aria-label="Conversation">
        {id ? <ConversationView key={id} id={id} uid={uid} onRead={reloadSoon} /> : <p className="text-slate2">Select a conversation.</p>}
      </section>
    </div>
  );
}

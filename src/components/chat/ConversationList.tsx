import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { ConversationItem } from '../../features/messaging/api';

const when = (iso: string) => {
  const d = new Date(iso), today = new Date();
  return d.toDateString() === today.toDateString() ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function ConversationList({ items, uid, loading, error, onRetry }: { items: ConversationItem[]; uid: string; loading: boolean; error: string | null; onRetry: () => void }) {
  const [q, setQ] = useState('');
  const shown = items.filter(i => i.display_name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-3">
        <h1 className="mb-2 text-xl font-extrabold">Messages</h1>
        <label className="relative block"><span className="sr-only">Search conversations</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate2" aria-hidden />
          <input className="field py-2 pl-9" placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} /></label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-slate2" role="status">Loading…</p>}
        {error && <p className="p-4 text-bad" role="alert">{error} <button className="underline" onClick={onRetry}>Retry</button></p>}
        {!loading && !error && items.length === 0 && <p className="p-6 text-center text-slate2">No conversations yet. Match with someone in Discover, then say hello.</p>}
        {!loading && items.length > 0 && shown.length === 0 && <p className="p-6 text-center text-slate2">No one matches “{q}”.</p>}
        <ul>
          {shown.map(c => (
            <li key={c.conversation_id}>
              <NavLink to={`/chat/${c.conversation_id}`} className={({ isActive }) => `flex items-center gap-3 border-b border-line px-3 py-3 ${isActive ? 'bg-mist' : 'hover:bg-mist'}`}>
                {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="h-12 w-12 rounded-full bg-line" />}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2"><span className={`truncate ${c.unread_count ? 'font-extrabold' : 'font-semibold'}`}>{c.display_name}</span>
                    <span className="shrink-0 text-xs text-slate2">{when(c.last_message_at ?? c.matched_at)}</span></span>
                  <span className={`block truncate text-sm ${c.unread_count ? 'font-semibold text-ink' : 'text-slate2'}`}>
                    {c.last_message ? `${c.last_sender_id === uid ? 'You: ' : ''}${c.last_message}` : 'New match. Say hello.'}</span>
                </span>
                {c.unread_count > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-royal px-1.5 text-xs font-bold text-white" aria-label={`${c.unread_count} unread`}>{c.unread_count}</span>}
              </NavLink>
            </li>))}
        </ul>
      </div>
    </div>
  );
}

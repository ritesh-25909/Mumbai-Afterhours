import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { Msg } from './api';

type Listener = (m: Msg) => void;
type Ctx = { subscribe: (fn: Listener) => () => void; live: boolean };
const C = createContext<Ctx>({ subscribe: () => () => {}, live: false });

// One realtime channel for the whole signed-in app (inbox, open chat and unread badge share it).
export function ChatEventsProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const listeners = useRef(new Set<Listener>());
  const [live, setLive] = useState(false);
  useEffect(() => {
    const ch = supabase.channel(`messages:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => listeners.current.forEach(fn => fn(p.new as Msg)))
      .subscribe(status => setLive(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [uid]);
  const subscribe = useCallback((fn: Listener) => { listeners.current.add(fn); return () => { listeners.current.delete(fn); }; }, []);
  const value = useMemo(() => ({ subscribe, live }), [subscribe, live]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useMessageEvents(cb: Listener) {
  const { subscribe } = useContext(C);
  const ref = useRef(cb); ref.current = cb;
  useEffect(() => subscribe(m => ref.current(m)), [subscribe]);
}
export const useRealtimeLive = () => useContext(C).live;

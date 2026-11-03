
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '../../lib/supabase';
import type { Msg } from './api';

type Listener = (m: Msg) => void;

type Ctx = {
  subscribe: (fn: Listener) => () => void;
  live: boolean;
  onlineUsers: string[];
};

type PresenceUser = {
  user_id?: string;
  online_at?: string;
};

const C = createContext<Ctx>({
  subscribe: () => () => {},
  live: false,
  onlineUsers: [],
});

// One message realtime channel and one shared presence channel
// for the whole signed-in application.
export function ChatEventsProvider({
  uid,
  children,
}: {
  uid: string;
  children: ReactNode;
}) {
  const listeners = useRef(new Set<Listener>());

  const [live, setLive] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  /* =====================================================
     MESSAGE REALTIME CHANNEL
  ===================================================== */

  useEffect(() => {
    const ch = supabase
      .channel(`messages:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          listeners.current.forEach((fn) =>
            fn(payload.new as Msg)
          );
        }
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
      });

    return () => {
      setLive(false);
      void supabase.removeChannel(ch);
    };
  }, [uid]);

  /* =====================================================
     REAL ONLINE / OFFLINE PRESENCE
  ===================================================== */

  useEffect(() => {
    let active = true;

    const presenceChannel = supabase.channel(
      'mumbai-afterhours-online-users',
      {
        config: {
          presence: {
            key: uid,
          },
        },
      }
    );

    // Read all currently connected users from shared presence.
    const refreshPresence = () => {
      if (!active) return;

      const state = presenceChannel.presenceState() as Record<
        string,
        PresenceUser[]
      >;

      const users = new Set<string>();

      Object.values(state).forEach((sessions) => {
        sessions.forEach((session) => {
          if (session.user_id) {
            users.add(session.user_id);
          }
        });
      });

      setOnlineUsers([...users]);
    };

    presenceChannel
      .on('presence', { event: 'sync' }, refreshPresence)
      .on('presence', { event: 'join' }, refreshPresence)
      .on('presence', { event: 'leave' }, refreshPresence)
      .subscribe(async (status) => {
        if (!active) return;

        if (status === 'SUBSCRIBED') {
          // Register this authenticated user as online.
          await presenceChannel.track({
            user_id: uid,
            online_at: new Date().toISOString(),
          });

          refreshPresence();
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setOnlineUsers((current) =>
            current.filter((userId) => userId !== uid)
          );
        }
      });

    return () => {
      active = false;

      // Remove this browser session from presence.
      void presenceChannel.untrack();

      void supabase.removeChannel(presenceChannel);
    };
  }, [uid]);

  /* =====================================================
     MESSAGE LISTENER SUBSCRIPTION
  ===================================================== */

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);

    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const value = useMemo(
    () => ({
      subscribe,
      live,
      onlineUsers,
    }),
    [subscribe, live, onlineUsers]
  );

  return (
    <C.Provider value={value}>
      {children}
    </C.Provider>
  );
}

/* =====================================================
   MESSAGE EVENT HOOK
===================================================== */

export function useMessageEvents(cb: Listener) {
  const { subscribe } = useContext(C);

  const ref = useRef(cb);
  ref.current = cb;

  useEffect(
    () => subscribe((message) => ref.current(message)),
    [subscribe]
  );
}

/* =====================================================
   REALTIME CONNECTION STATUS
===================================================== */

export const useRealtimeLive = () => useContext(C).live;

/* =====================================================
   ONLINE USER CHECK
===================================================== */

export function useUserOnline(
  userId: string | null | undefined
): boolean {
  const { onlineUsers } = useContext(C);

  return Boolean(
    userId && onlineUsers.includes(userId)
  );
}

/* =====================================================
   ALL ONLINE USERS
===================================================== */

export function useOnlineUsers(): string[] {
  return useContext(C).onlineUsers;
}

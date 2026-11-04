
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
import {
  getChatPrivacySettings,
  updateMyLastActive,
  type ChatPrivacySettings,
  DEFAULT_CHAT_PRIVACY,
} from './api';

type Listener = (m: Msg) => void;

type Ctx = {
  subscribe: (fn: Listener) => () => void;
  live: boolean;
  onlineUsers: string[];
  privacy: ChatPrivacySettings;
  refreshPrivacy: () => Promise<void>;
};

const C = createContext<Ctx>({
  subscribe: () => () => {},
  live: false,
  onlineUsers: [],
  privacy: DEFAULT_CHAT_PRIVACY,
  refreshPrivacy: async () => {},
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
  const [privacy, setPrivacy] =
    useState<ChatPrivacySettings>(DEFAULT_CHAT_PRIVACY);

  const privacyRef = useRef(privacy);
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );

  // Keep privacy ref synchronized.
  useEffect(() => {
    privacyRef.current = privacy;
  }, [privacy]);

  /* =====================================================
     LOAD PRIVACY SETTINGS
  ===================================================== */

  const refreshPrivacy = useCallback(async () => {
    try {
      const settings = await getChatPrivacySettings();

      setPrivacy(settings);
      privacyRef.current = settings;
    } catch (error) {
      console.error('Could not refresh chat privacy:', error);
    }
  }, []);

  useEffect(() => {
    void refreshPrivacy();
  }, [refreshPrivacy, uid]);

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
     REALTIME ONLINE / OFFLINE PRESENCE
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

    presenceRef.current = presenceChannel;

    const refreshPresence = () => {
      if (!active) return;

      const state = presenceChannel.presenceState();

      const users = Object.entries(state)
        .filter(([, sessions]) => sessions.length > 0)
        .map(([userId]) => userId);

      setOnlineUsers(users);
    };

    presenceChannel
      .on('presence', { event: 'sync' }, refreshPresence)
      .on('presence', { event: 'join' }, refreshPresence)
      .on('presence', { event: 'leave' }, refreshPresence)
      .subscribe(async (status) => {
        if (!active) return;

        if (status === 'SUBSCRIBED') {
          try {
            const settings = privacyRef.current;

            if (settings.activity_status_enabled) {
              await presenceChannel.track({
  user_id: uid,
  online_at: new Date().toISOString(),
});
            }

            if (active) refreshPresence();
          } catch (error) {
            console.error('Presence tracking failed:', error);

            if (active) {
              setOnlineUsers((current) =>
                current.filter((userId) => userId !== uid)
              );
            }
          }
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
      presenceRef.current = null;

      void presenceChannel.untrack();
      void supabase.removeChannel(presenceChannel);
    };
  }, [uid]);

  /* =====================================================
     ACTIVITY HEARTBEAT
  ===================================================== */

  useEffect(() => {
    let active = true;

    const updateActivity = () => {
      if (
        !active ||
        document.visibilityState !== 'visible' ||
        !privacyRef.current.activity_status_enabled
      ) {
        return;
      }

      void updateMyLastActive();
    };

    updateActivity();

    const interval = window.setInterval(
      updateActivity,
      60_000
    );

    document.addEventListener(
      'visibilitychange',
      updateActivity
    );

    const handleActivity = () => updateActivity();

    window.addEventListener('focus', handleActivity);

    return () => {
      active = false;

      window.clearInterval(interval);

      document.removeEventListener(
        'visibilitychange',
        updateActivity
      );

      window.removeEventListener('focus', handleActivity);
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
      privacy,
      refreshPrivacy,
    }),
    [
      subscribe,
      live,
      onlineUsers,
      privacy,
      refreshPrivacy,
    ]
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
  const { onlineUsers, privacy } = useContext(C);

  return Boolean(
    userId &&
    privacy.activity_status_enabled &&
    onlineUsers.includes(userId)
  );
}

/* =====================================================
   ALL ONLINE USERS
===================================================== */

export function useOnlineUsers(): string[] {
  const { onlineUsers } = useContext(C);
  return onlineUsers;
}

/* =====================================================
   PRIVACY SETTINGS HOOK
===================================================== */

export function useChatPrivacy() {
  const { privacy, refreshPrivacy } = useContext(C);

  return {
    privacy,
    refreshPrivacy,
  };
}

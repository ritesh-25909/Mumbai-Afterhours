import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Subscribe first so auth changes during initialization are not missed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setLoading(false);
    });

    // getSession() restores the locally persisted Supabase session. Do not
    // clear it merely because a separate network validation request fails.
    const initializeAuth = async () => {
      try {
        const {
          data: { session: storedSession },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;
        if (active) setSession(storedSession);
      } catch (error) {
        // Keep any session already received through onAuthStateChange.
        console.error('Could not restore the saved authentication session:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void initializeAuth();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
  };

  return (
    <Ctx.Provider value={{ session, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}


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

      // Listen for login, logout, token refresh and session changes.
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (active) {
          setSession(newSession);
          setLoading(false);
        }
      });

      // Restore and validate the stored authentication session.
      const initializeAuth = async () => {
        try {
          const {
            data: { session: storedSession },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          if (!storedSession) {
            if (active) {
              setSession(null);
            }
            return;
          }

          // Verify that the user still exists in Supabase Auth.
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser(storedSession.access_token);

          if (userError || !user) {
            console.warn(
              'Stored authentication session is invalid:',
              userError
            );

            await supabase.auth.signOut({ scope: 'local' });

            if (active) {
              setSession(null);
            }
            return;
          }

          // Keep the verified session.
          if (active) {
            setSession(storedSession);
          }
        } catch (error) {
          console.error(
            'Authentication initialization failed:',
            error
          );

          try {
            await supabase.auth.signOut({ scope: 'local' });
          } catch (signOutError) {
            console.error(
              'Failed to clear invalid local session:',
              signOutError
            );
          }

          if (active) {
            setSession(null);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void initializeAuth();

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    }, []);

    // Sign out from the current browser session.
    const signOut = async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setSession(null);
    };

    return (
      <Ctx.Provider
        value={{
          session,
          loading,
          signOut,
        }}
      >
        {children}
      </Ctx.Provider>
    );
  }

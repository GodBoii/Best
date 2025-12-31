'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSession, getUser, onAuthStateChange } from './supabaseAuth';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function syncSession() {
      try {
        const currentSession = await getSession();
        let currentUser = currentSession?.user ?? null;

        if (!currentUser) {
          currentUser = await getUser().catch(() => null);
        }

        if (isMounted) {
          setSession(currentSession ?? null);
          setUser(currentUser ?? null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    syncSession();

    const subscription = onAuthStateChange(({ session: nextSession }) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({ user, session, loading }),
    [user, session, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

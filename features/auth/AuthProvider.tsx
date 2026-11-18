import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) console.warn('Session restore failed:', error.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session, user: session?.user ?? null, loading, configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      if (!isSupabaseConfigured) throw new Error('Connect your Supabase project in the .env file first.');
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    signUp: async (displayName, email, password) => {
      if (!isSupabaseConfigured) throw new Error('Connect your Supabase project in the .env file first.');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) throw error;
      return { needsEmailConfirmation: !data.session };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    sendPasswordReset: async (email) => {
      if (!isSupabaseConfigured) throw new Error('Connect your Supabase project in the .env file first.');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'togetherly://reset-password',
      });
      if (error) throw error;
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

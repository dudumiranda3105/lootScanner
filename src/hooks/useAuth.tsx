import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { isSupabaseConfigured, requireSupabase, supabase, traduzErro } from '../services/supabase';

export interface HunterProfile {
  id: string;
  hunterName: string;
}

interface AuthContextValue {
  /** `false` enquanto a sessão salva no dispositivo ainda está sendo lida. */
  ready: boolean;
  session: Session | null;
  profile: HunterProfile | null;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, hunterName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateHunterName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<HunterProfile | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // Perfil (nome de caçador) acompanha a sessão.
  useEffect(() => {
    const userId = session?.user.id;
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }

    let active = true;

    supabase
      .from('profiles')
      .select('id, hunter_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn('[auth] não foi possível ler o perfil:', error.message);
          return;
        }
        setProfile(
          data
            ? { id: data.id as string, hunterName: (data.hunter_name as string) ?? 'Caçador' }
            : { id: userId, hunterName: 'Caçador' },
        );
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw new Error(traduzErro(error.message));
  }, []);

  const signUp = useCallback(async (email: string, password: string, hunterName: string) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      // O gatilho `handle_new_user` no PostgreSQL lê isto para criar o perfil.
      options: { data: { hunter_name: hunterName.trim() || 'Caçador' } },
    });
    if (error) throw new Error(traduzErro(error.message));

    // Com "Confirm email" ligado no painel, o cadastro não devolve sessão.
    if (!data.session) {
      throw new Error(
        'Conta criada! Confirme o e-mail pelo link enviado e depois faça login. ' +
          '(Para a apresentação, desative "Confirm email" em Authentication ▸ Providers ▸ Email.)',
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateHunterName = useCallback(
    async (name: string) => {
      const client = requireSupabase();
      const userId = session?.user.id;
      if (!userId) throw new Error('É preciso estar logado para mudar o nome.');

      const hunterName = name.trim() || 'Caçador';
      const { error } = await client
        .from('profiles')
        .upsert({ id: userId, hunter_name: hunterName });
      if (error) throw new Error(traduzErro(error.message));

      setProfile({ id: userId, hunterName });
    },
    [session?.user.id],
  );

  const value = useMemo(
    () => ({
      ready,
      session,
      profile,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      updateHunterName,
    }),
    [ready, session, profile, signIn, signUp, signOut, updateHunterName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}

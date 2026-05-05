import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthContextValue>({ session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ session, loading, signOut: async () => { await supabase.auth.signOut(); } }}>
    {children}
  </Ctx.Provider>;
}

export function useAuth() { return useContext(Ctx); }

// Em dev (LAN/celular) usamos o proxy do Vite — então caminho relativo basta.
// Em prod, defina VITE_API_URL para a URL absoluta do backend.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function useAuthedFetch() {
  const { session } = useAuth();
  return async function<T>(path: string, init: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
    const baseHeaders: Record<string, string> = isFormData
      ? {} // não setar Content-Type quando FormData (browser põe boundary)
      : { 'Content-Type': 'application/json' };
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...baseHeaders,
        Authorization: session ? `Bearer ${session.access_token}` : '',
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  };
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContext {
  session: Session | null;
  token: string | null;
  loading: boolean;
  signOut: () => void;
}

const AuthCtx = createContext<AuthContext>({
  session: null,
  token: null,
  loading: true,
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.push("/login");
  };

  const token = session?.access_token ?? null;

  return (
    <AuthCtx.Provider value={{ session, token, loading, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

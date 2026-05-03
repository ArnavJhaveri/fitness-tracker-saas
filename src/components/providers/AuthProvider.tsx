"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { AuthState } from "@/types/auth";

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Provides the auth state (user + session) to all client components.
 * Subscribes to Supabase's onAuthStateChange so the UI stays in sync with
 * token refreshes and sign-out events across browser tabs.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const supabase = createClient();

    // Hydrate from the current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
      }));
    });

    // Stay in sync with auth events (token refresh, sign in, sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within <AuthProvider>");
  }
  return ctx;
}

// ─── Convenience consumer ─────────────────────────────────────────────────────

/** Returns the current user or null. Throws if used outside AuthProvider. */
export function useCurrentUser(): User | null {
  return useAuthContext().user;
}

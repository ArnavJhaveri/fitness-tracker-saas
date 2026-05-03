"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { ROUTES } from "@/constants";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth";

/**
 * High-level auth hook.
 * Combines raw Supabase auth methods with routing and state management.
 * Use this in UI components instead of calling supabase.auth directly.
 */
export function useAuth() {
  const authState = useAuthContext();
  const router = useRouter();

  const signIn = useCallback(
    async ({ email, password }: LoginInput) => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(ROUTES.DASHBOARD);
      router.refresh();
    },
    [router],
  );

  const signUp = useCallback(async ({ email, password, full_name }: RegisterInput) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(ROUTES.LOGIN);
    router.refresh();
  }, [router]);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${ROUTES.RESET_PASSWORD}`,
    });
    if (error) throw error;
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}

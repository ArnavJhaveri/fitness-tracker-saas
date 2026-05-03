"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/providers/AuthProvider";
import type { Profile } from "@/types/database";
import type { UpdateProfileInput } from "@/lib/validations/auth";

const PROFILE_QUERY_KEY = ["profile"] as const;

/** Fetches and caches the current user's profile from the `profiles` table. */
export function useUserProfile() {
  const { user } = useAuthContext();

  return useQuery<Profile | null>({
    queryKey: [...PROFILE_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // profiles change rarely
  });
}

/** Updates the current user's profile and invalidates the cache. */
export function useUpdateProfile() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation<Profile, Error, UpdateProfileInput>({
    mutationFn: async (input) => {
      if (!user) throw new Error("Not authenticated");
      const supabase = createClient();
      // updated_at is managed by the profiles_set_updated_at Postgres trigger —
      // no need to pass it here; doing so would require an unsafe cast.
      const { data, error } = await supabase
        .from("profiles")
        .update(input)
        .eq("id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}

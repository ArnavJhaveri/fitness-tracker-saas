import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSettings } from "@/types/database";
import type { UpdateSettingsInput } from "@/lib/validations/settings";

export async function getSettings(supabase: SupabaseClient, userId: string): Promise<UserSettings> {
  // `.maybeSingle()` returns `data: null, error: null` when zero rows match,
  // distinguishing the "no row yet" case (legitimate — defensive upsert) from
  // a real error (RLS denial, network failure, malformed request — must throw).
  // Earlier this used `.single()` + a blanket `if (error || !data) upsert(...)`
  // which silently masked auth bugs by inserting a phantom row whenever the
  // session was bad, hiding the real problem.
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as UserSettings;

  // No row yet. Auto-creation on signup is a database trigger so this should
  // be rare, but legacy users predating the trigger and edge-case race
  // conditions still hit this path. Upsert is idempotent under concurrency.
  const { data: created, error: createErr } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId })
    .select()
    .single();
  if (createErr || !created) throw createErr ?? new Error("Failed to create settings");
  return created as UserSettings;
}

export async function upsertSettings(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateSettingsInput,
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ ...input, user_id: userId })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Failed to save settings");
  return data as UserSettings;
}

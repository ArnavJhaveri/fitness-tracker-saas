import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSettings } from "@/types/database";
import type { UpdateSettingsInput } from "@/lib/validations/settings";

export async function getSettings(supabase: SupabaseClient, userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // Row should always exist (auto-created on signup), but defensively upsert.
    const { data: created, error: createErr } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId })
      .select()
      .single();
    if (createErr || !created) throw createErr ?? new Error("Failed to create settings");
    return created as UserSettings;
  }

  return data as UserSettings;
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

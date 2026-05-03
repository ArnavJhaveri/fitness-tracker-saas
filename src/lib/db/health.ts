import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/lib/errors";
import type { SleepEntry, WaterEntry, WeightEntry } from "@/types/database";
import type {
  CreateSleepEntryInput,
  CreateWaterEntryInput,
  CreateWeightEntryInput,
} from "@/lib/validations/health";

// ─── Sleep ────────────────────────────────────────────────────────────────────

export async function listSleepEntries(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; per_page: number; from?: string; to?: string },
): Promise<{ data: SleepEntry[]; count: number }> {
  let query = supabase
    .from("sleep_entries")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("sleep_start", { ascending: false })
    .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

  if (params.from) query = query.gte("sleep_start", params.from);
  if (params.to) query = query.lte("sleep_start", params.to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as SleepEntry[], count: count ?? 0 };
}

export async function createSleepEntry(
  supabase: SupabaseClient,
  userId: string,
  input: CreateSleepEntryInput,
): Promise<SleepEntry> {
  const { data, error } = await supabase
    .from("sleep_entries")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as SleepEntry;
}

export async function updateSleepEntry(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: Partial<CreateSleepEntryInput>,
): Promise<SleepEntry> {
  const { data, error } = await supabase
    .from("sleep_entries")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Sleep entry");
  return data as SleepEntry;
}

export async function deleteSleepEntry(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("sleep_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── Water ────────────────────────────────────────────────────────────────────

export async function listWaterEntries(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; per_page: number; from?: string; to?: string },
): Promise<{ data: WaterEntry[]; count: number }> {
  let query = supabase
    .from("water_entries")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

  if (params.from) query = query.gte("logged_at", params.from);
  if (params.to) query = query.lte("logged_at", params.to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as WaterEntry[], count: count ?? 0 };
}

export async function createWaterEntry(
  supabase: SupabaseClient,
  userId: string,
  input: CreateWaterEntryInput,
): Promise<WaterEntry> {
  const { data, error } = await supabase
    .from("water_entries")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as WaterEntry;
}

export async function deleteWaterEntry(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("water_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── Weight ───────────────────────────────────────────────────────────────────

export async function listWeightEntries(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; per_page: number; from?: string; to?: string },
): Promise<{ data: WeightEntry[]; count: number }> {
  let query = supabase
    .from("weight_entries")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

  if (params.from) query = query.gte("logged_at", params.from);
  if (params.to) query = query.lte("logged_at", params.to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as WeightEntry[], count: count ?? 0 };
}

export async function createWeightEntry(
  supabase: SupabaseClient,
  userId: string,
  input: CreateWeightEntryInput,
): Promise<WeightEntry> {
  const { data, error } = await supabase
    .from("weight_entries")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as WeightEntry;
}

export async function updateWeightEntry(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: Partial<CreateWeightEntryInput>,
): Promise<WeightEntry> {
  const { data, error } = await supabase
    .from("weight_entries")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Weight entry");
  return data as WeightEntry;
}

export async function deleteWeightEntry(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("weight_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

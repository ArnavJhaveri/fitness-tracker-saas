import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/lib/errors";
import type { Goal } from "@/types/database";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validations/health";

export async function listGoals(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; per_page: number; status?: string },
): Promise<{ data: Goal[]; count: number }> {
  let query = supabase
    .from("goals")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range((params.page - 1) * params.per_page, params.page * params.per_page - 1);

  if (params.status) query = query.eq("status", params.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as Goal[], count: count ?? 0 };
}

export async function getGoal(supabase: SupabaseClient, userId: string, id: string): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new NotFoundError("Goal");
  return data as Goal;
}

export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  input: CreateGoalInput,
): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: UpdateGoalInput,
): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error || !data) throw new NotFoundError("Goal");
  return data as Goal;
}

export async function deleteGoal(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

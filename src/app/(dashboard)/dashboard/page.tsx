import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { DashboardOverview } from "./_components/DashboardOverview";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col">
      <Header title="Overview" />
      <div className="p-4 sm:p-6">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Good day, {firstName} 👋
        </h2>
        <DashboardOverview />
      </div>
    </div>
  );
}

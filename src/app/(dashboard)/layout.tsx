import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ROUTES } from "@/constants";

/**
 * Dashboard layout — server component that protects the entire route group.
 * Middleware also checks auth, but this double-check ensures server renders
 * never expose data even if middleware is misconfigured.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className="flex h-full">
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}

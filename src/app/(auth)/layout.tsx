import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { APP_NAME, ROUTES } from "@/constants";

export const metadata: Metadata = {
  title: { absolute: APP_NAME },
};

/**
 * Shared layout for all auth pages (login, register, forgot-password, reset-password).
 * Centered card with app branding at the top.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Link href={ROUTES.HOME} className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{APP_NAME}</span>
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
}

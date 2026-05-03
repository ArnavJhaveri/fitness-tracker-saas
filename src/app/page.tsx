/**
 * Public landing page.
 * Authenticated users are redirected to /dashboard by middleware.
 */
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROUTES, APP_NAME, APP_DESCRIPTION } from "@/constants";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      <div className="mx-auto max-w-2xl text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-100">
          {APP_NAME}
        </h1>

        <p className="mb-10 text-lg leading-8 text-gray-600 dark:text-gray-400">
          {APP_DESCRIPTION}
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href={ROUTES.REGISTER}>Get started — it&apos;s free</Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href={ROUTES.LOGIN}>Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

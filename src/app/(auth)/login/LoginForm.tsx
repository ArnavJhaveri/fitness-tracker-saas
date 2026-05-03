"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants";
import type { LoginInput } from "@/lib/validations/auth";

// Human-readable messages for ?error= params set by /auth/callback
const AUTH_ERRORS: Record<string, string> = {
  confirmation_failed: "The confirmation link is invalid or has expired. Please request a new one.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});

  // Surface any error that the auth callback redirected us here with
  const callbackError = searchParams.get("error");
  const bannerError =
    error ??
    (callbackError ? (AUTH_ERRORS[callbackError] ?? "An authentication error occurred.") : null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = { email: formData.get("email"), password: formData.get("password") };

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // Respect redirectTo set by the proxy when the user was sent to /login
    // from a protected route (e.g. /weight → /login?redirectTo=/weight).
    // Only allow relative paths to prevent open-redirect attacks.
    const redirectTo = searchParams.get("redirectTo") ?? "";
    const safePath = redirectTo.startsWith("/") ? redirectTo : ROUTES.DASHBOARD;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(safePath as any);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {bannerError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
        >
          {bannerError}
        </div>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={fieldErrors.email}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fieldErrors.password}
      />

      <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
        Sign in
      </Button>
    </form>
  );
}

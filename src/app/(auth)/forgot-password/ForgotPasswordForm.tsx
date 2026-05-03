"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}${ROUTES.RESET_PASSWORD}`,
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
    setIsLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-6 text-center dark:border-green-800 dark:bg-green-950/30">
        <p className="font-medium text-green-800 dark:text-green-300">Check your email</p>
        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
          If an account exists for that email, we&apos;ve sent a password reset link.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
        >
          {error}
        </div>
      )}
      <Input label="Email" name="email" type="email" autoComplete="email" required />
      <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
        Send reset link
      </Button>
    </form>
  );
}

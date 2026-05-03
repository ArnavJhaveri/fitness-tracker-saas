"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants";

export function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    router.push(ROUTES.LOGIN);
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
      <Input
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
      />
      <Input
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
      />
      <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
        Update password
      </Button>
    </form>
  );
}

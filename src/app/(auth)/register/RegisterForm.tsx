"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validations/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants";
import type { RegisterInput } from "@/lib/validations/auth";

// ─── Password rules ───────────────────────────────────────────────────────────

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At most 72 characters", test: (p: string) => p.length <= 72 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
] as const;

const STRENGTH_CONFIG = [
  { label: "Very weak", color: "bg-red-500", text: "text-red-500" },
  { label: "Weak", color: "bg-orange-500", text: "text-orange-500" },
  { label: "Fair", color: "bg-amber-500", text: "text-amber-500" },
  { label: "Good", color: "bg-blue-500", text: "text-blue-500" },
  { label: "Strong", color: "bg-green-500", text: "text-green-500" },
] as const;

// ─── Shared password input with show/hide toggle ──────────────────────────────

interface PasswordFieldProps {
  label: string;
  name: string;
  autoComplete: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: string;
}

function PasswordField({
  label,
  name,
  autoComplete,
  value,
  onChange,
  onFocus,
  onBlur,
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const id = name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          aria-invalid={!!error}
          className={cn(
            "h-10 w-full rounded-lg border px-3 py-2 pr-10 text-sm transition-colors",
            "bg-white text-gray-900 placeholder:text-gray-400",
            "dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500",
            "focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600",
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute top-0 right-0 flex h-10 w-10 items-center justify-center text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Password strength widget ─────────────────────────────────────────────────

function PasswordStrength({
  password,
  focused,
  touched,
}: {
  password: string;
  focused: boolean;
  touched: boolean;
}) {
  if (!touched) return null;

  const results = PASSWORD_RULES.map(({ label, test }) => ({ label, passed: test(password) }));
  const passing = results.filter((r) => r.passed).length;
  const allPassed = passing === PASSWORD_RULES.length;
  const strength = STRENGTH_CONFIG[Math.max(0, passing - 1)];

  if (allPassed && !focused) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Password looks great</span>
      </div>
    );
  }

  const showPanel = focused || (!allPassed && password.length > 0);

  return (
    <div className="flex flex-col gap-2">
      {password.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-0.5">
            {PASSWORD_RULES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  i < passing ? strength.color : "bg-gray-200 dark:bg-gray-700",
                )}
              />
            ))}
          </div>
          <span className={cn("text-xs font-medium transition-colors duration-300", strength.text)}>
            {strength.label}
          </span>
        </div>
      )}

      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          showPanel ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/60">
            {results.map(({ label, passed }) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                    passed
                      ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400",
                  )}
                >
                  {passed ? (
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  ) : (
                    <X className="h-2.5 w-2.5" strokeWidth={3} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs transition-colors duration-200",
                    passed
                      ? "text-green-700 dark:text-green-400"
                      : "text-gray-600 dark:text-gray-400",
                  )}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Email format indicator ───────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function EmailValidation({ email, touched }: { email: string; touched: boolean }) {
  if (!touched || email.length === 0) return null;

  const valid = EMAIL_RE.test(email);
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors duration-200",
        valid ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          valid
            ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
            : "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400",
        )}
      >
        {valid ? (
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        ) : (
          <X className="h-2.5 w-2.5" strokeWidth={3} />
        )}
      </span>
      {valid ? "Looks like a valid email" : "Enter a valid email address"}
    </div>
  );
}

// ─── Confirm password match indicator ────────────────────────────────────────

function ConfirmMatch({ password, confirm }: { password: string; confirm: string }) {
  if (confirm.length === 0) return null;

  const matches = password === confirm;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors duration-200",
        matches ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          matches
            ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
            : "bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400",
        )}
      >
        {matches ? (
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        ) : (
          <X className="h-2.5 w-2.5" strokeWidth={3} />
        )}
      </span>
      {matches ? "Passwords match" : "Passwords don't match"}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      full_name: formData.get("full_name"),
    };

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
        full_name: errors.full_name?.[0],
      });
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data: signUpData, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // If a session was returned, email confirmation is disabled — go straight to dashboard.
    // Otherwise, the user needs to click the confirmation link first.
    if (signUpData.session) {
      router.push(ROUTES.DASHBOARD);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-5 py-6 text-center dark:border-green-800 dark:bg-green-950/30">
        <p className="font-medium text-green-800 dark:text-green-300">Check your email</p>
        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
          We&apos;ve sent you a confirmation link. Click it to activate your account.
        </p>
        <button
          onClick={() => router.push(ROUTES.LOGIN)}
          className="mt-4 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Back to sign in
        </button>
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

      <Input
        label="Full name"
        name="full_name"
        type="text"
        autoComplete="name"
        required
        error={fieldErrors.full_name}
      />

      <div className="flex flex-col gap-2">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          error={fieldErrors.email}
        />
        <EmailValidation email={email} touched={emailTouched} />
      </div>

      {/* Password + strength */}
      <div className="flex flex-col gap-2">
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => {
            setPasswordFocused(true);
            setPasswordTouched(true);
          }}
          onBlur={() => setPasswordFocused(false)}
          error={fieldErrors.password}
        />
        <PasswordStrength password={password} focused={passwordFocused} touched={passwordTouched} />
      </div>

      {/* Confirm password + match indicator */}
      <div className="flex flex-col gap-2">
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
        />
        <ConfirmMatch password={password} confirm={confirmPassword} />
      </div>

      <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
        Create account
      </Button>
    </form>
  );
}

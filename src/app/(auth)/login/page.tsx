/**
 * Login page — Server Component shell.
 * The actual form is a Client Component to use React state / form submission.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
      </div>

      {/* Suspense required because LoginForm uses useSearchParams() */}
      <Suspense
        fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />}
      >
        <LoginForm />
      </Suspense>

      <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-gray-500 dark:text-gray-400">
        <Link
          href={ROUTES.FORGOT_PASSWORD}
          className="text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Forgot your password?
        </Link>
        <span>
          Don&apos;t have an account?{" "}
          <Link
            href={ROUTES.REGISTER}
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Sign up
          </Link>
        </span>
      </div>
    </>
  );
}

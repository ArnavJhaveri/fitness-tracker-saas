import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Forgot password?</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Remembered it?{" "}
        <Link href={ROUTES.LOGIN} className="text-indigo-600 hover:underline dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </>
  );
}

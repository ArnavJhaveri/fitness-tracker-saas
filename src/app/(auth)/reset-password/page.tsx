import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Set new password</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choose a strong password for your account.
        </p>
      </div>
      <ResetPasswordForm />
    </>
  );
}

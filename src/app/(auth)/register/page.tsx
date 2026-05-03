import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Start tracking your fitness journey
        </p>
      </div>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link href={ROUTES.LOGIN} className="text-indigo-600 hover:underline dark:text-indigo-400">
          Sign in
        </Link>
      </p>
    </>
  );
}

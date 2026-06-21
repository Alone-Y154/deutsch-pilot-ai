import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf9] px-6">
      <section className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6">
        <Link href="/" className="text-sm font-semibold text-teal-700">
          DeutschPilot AI
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          Continue your German training
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Login with a password, create a new account, or use a magic link. Supabase
          Auth keeps every saved attempt tied to your own RLS-protected rows.
        </p>
        <LoginForm defaultMode="signin" />
        <p className="mt-5 text-center text-sm text-neutral-600">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-teal-700">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

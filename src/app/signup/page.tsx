import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8faf9] px-6">
      <section className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6">
        <Link href="/" className="text-sm font-semibold text-teal-700">
          DeutschPilot AI
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          Create your learner account
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Your speaking attempts, interview reports, weak tags, and scores will be
          stored under your own Supabase user.
        </p>
        <LoginForm defaultMode="signup" />
        <p className="mt-5 text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-teal-700">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

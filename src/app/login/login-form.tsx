"use client";

import { Loader2, Lock, Mail, UserPlus } from "lucide-react";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "magic" | "signin" | "signup";

export function LoginForm({ defaultMode = "magic" }: { defaultMode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase env vars are not configured yet.");
      return;
    }

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getCallbackUrl(),
          shouldCreateUser: false,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("sent");
      setMessage("Check your inbox for the magic link.");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setMessage("Use at least 6 characters for the password.");
      return;
    }

    if (mode === "signup") {
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
        }),
      });
      const signupData = (await signupResponse.json()) as {
        created?: boolean;
        waitlisted?: boolean;
        message?: string;
        error?: string;
      };

      if (!signupResponse.ok) {
        setStatus("error");
        setMessage(signupData.error || "Could not create account.");
        return;
      }

      if (signupData.waitlisted) {
        setStatus("sent");
        setMessage(signupData.message || "The beta is full. You are on the waitlist.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      finishSignedIn();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    finishSignedIn();
  }

  function finishSignedIn() {
    setStatus("sent");
    setMessage("Signed in. Redirecting to your dashboard...");
    window.location.assign(getNextPath());
  }

  return (
    <form onSubmit={submitAuth} className="mt-6 space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
        {[
          ["magic", "Magic link"],
          ["signin", "Login"],
          ["signup", "Sign up"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value as AuthMode);
              setStatus("idle");
              setMessage("");
            }}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-semibold transition",
              mode === value
                ? "bg-white text-teal-800 shadow-sm"
                : "text-neutral-600 hover:bg-white/70",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "signup" ? (
        <label className="block">
          <span className="text-sm font-semibold text-neutral-700">Name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Alex"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="text-sm font-semibold text-neutral-700">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="you@example.com"
        />
      </label>

      {mode !== "magic" ? (
        <label className="block">
          <span className="text-sm font-semibold text-neutral-700">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="At least 6 characters"
          />
        </label>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : mode === "signup" ? (
          <UserPlus className="h-4 w-4" />
        ) : mode === "signin" ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {mode === "magic"
          ? "Send magic link"
          : mode === "signup"
            ? "Create account"
            : "Login"}
      </button>
      {message ? (
        <p
          className={cn(
            "rounded-md border p-3 text-sm",
            status === "error"
              ? "border-rose-200 bg-rose-50 text-rose-950"
              : "border-neutral-200 bg-neutral-50 text-neutral-700",
          )}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

function getCallbackUrl() {
  const url = new URL("/auth/callback", window.location.origin);
  url.searchParams.set("next", getNextPath());
  return url.toString();
}

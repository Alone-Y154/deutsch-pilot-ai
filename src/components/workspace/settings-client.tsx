"use client";

import {
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ConfigStatus = {
  openai: boolean;
  realtimeModel: boolean;
  transcriptionModel: boolean;
  feedbackModel: boolean;
  ttsModel: boolean;
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  serviceRole: boolean;
};

const labels: Array<[keyof ConfigStatus, string, string]> = [
  ["openai", "OpenAI API key", "Server-side AI generation, feedback, and reports."],
  ["realtimeModel", "Realtime model", "Live mic correction and voice sessions."],
  ["transcriptionModel", "Transcription model", "Audio upload and fallback transcription."],
  ["feedbackModel", "Feedback model", "Structured reports, lessons, exams, and drills."],
  ["ttsModel", "Text-to-speech model", "Generated German audio for Listening Lab."],
  ["supabaseUrl", "Supabase project URL", "Browser and server database connection."],
  ["supabaseAnonKey", "Supabase publishable anon key", "Client auth with RLS protection."],
  ["serviceRole", "Supabase service role key", "Optional backend-only admin operations."],
];

export function SettingsClient() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deactivationStatus, setDeactivationStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [deactivationMessage, setDeactivationMessage] = useState("");

  async function loadConfig() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/health/config");
      const data = (await response.json()) as unknown;

      if (!response.ok || !isConfigStatus(data)) {
        throw new Error("Could not read configuration status.");
      }

      setConfig(data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Config check failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/api/health/config")
      .then((response) => response.json().then((data: unknown) => ({ data, response })))
      .then(({ data, response }) => {
        if (!active) return;

        if (!response.ok || !isConfigStatus(data)) {
          throw new Error("Could not read configuration status.");
        }

        setConfig(data);
      })
      .catch((caughtError: unknown) => {
        if (!active) return;

        setError(
          caughtError instanceof Error ? caughtError.message : "Config check failed.",
        );
      })
      .finally(() => {
        if (!active) return;

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const readyCount = config
    ? labels.filter(([key]) => config[key]).length
    : 0;

  async function deactivateAccount() {
    setDeactivationStatus("loading");
    setDeactivationMessage("");

    try {
      const response = await fetch("/api/account/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = (await response.json()) as { error?: string; deactivated?: boolean };

      if (!response.ok || !data.deactivated) {
        throw new Error(data.error || "Could not deactivate account.");
      }

      router.replace("/account-deactivated");
      router.refresh();
    } catch (caughtError) {
      setDeactivationStatus("error");
      setDeactivationMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not deactivate account.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Settings
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Live production configuration
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              This page checks whether required environment variables are mapped. It
              only returns booleans, never secret values.
            </p>
          </div>
          <button
            type="button"
            onClick={loadConfig}
            disabled={loading}
            className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recheck
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-700" />
            <p className="text-sm font-semibold">Launch readiness</p>
          </div>
          <p className="mt-4 text-4xl font-semibold">{readyCount}/{labels.length}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Required secrets stay on the backend. The Supabase anon key is safe to
            expose when RLS policies are enabled.
          </p>
        </div>

        <div className="grid gap-3">
          {labels.map(([key, title, detail]) => {
            const enabled = Boolean(config?.[key]);

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-md bg-neutral-100 p-2">
                    <KeyRound className="h-4 w-4 text-neutral-700" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">{detail}</p>
                  </div>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold">
                  {enabled ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-teal-700" />
                      Set
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-rose-700" />
                      Missing
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoPanel
          title="Frontend"
          items={[
            "Uses the publishable Supabase anon key.",
            "Reads and writes only through RLS-owned rows.",
            "Never receives OpenAI or service-role secrets.",
          ]}
        />
        <InfoPanel
          title="Backend"
          items={[
            "Calls OpenAI from Next.js API routes.",
            "Issues short-lived realtime client secrets.",
            "Can use service role later for trusted admin jobs.",
          ]}
        />
        <InfoPanel
          title="Privacy"
          items={[
            "Raw audio is not stored by default.",
            "Transcripts, scores, and reports can be revisited.",
            "Scores are practice feedback, not official grading.",
          ]}
        />
      </section>

      <section className="rounded-lg border border-rose-200 bg-rose-50 p-5">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 text-rose-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-rose-800">
              Danger zone
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-rose-950">
              Deactivate this account permanently
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-rose-950">
              This sets your profile status to inactive and signs you out. The account
              cannot be reactivated later in this beta.
            </p>
            <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row">
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-rose-300 bg-white px-3 py-2 text-sm"
                placeholder='Type "sure"'
              />
              <button
                type="button"
                onClick={deactivateAccount}
                disabled={deactivationStatus === "loading" || confirmation !== "sure"}
                className="flex items-center justify-center gap-2 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deactivationStatus === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Deactivate
              </button>
            </div>
            {deactivationMessage ? (
              <p className="mt-3 text-sm font-semibold text-rose-950">
                {deactivationMessage}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function isConfigStatus(value: unknown): value is ConfigStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const config = value as Record<keyof ConfigStatus, unknown>;

  return labels.every(([key]) => typeof config[key] === "boolean");
}

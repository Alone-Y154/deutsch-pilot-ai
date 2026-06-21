"use client";

import { ArrowRight, CheckCircle2, Loader2, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { DiagnosticPlan } from "@/lib/ai/workspace-schemas";

type ApiResult<T> = {
  data: T;
  source: "openai" | "demo";
};

export function OnboardingClient() {
  const [goal, setGoal] = useState("Prepare for German job interviews and B1 speaking");
  const [experience, setExperience] = useState(
    "I studied A2 basics, can read simple text, but speaking is slow.",
  );
  const [selfAssessment, setSelfAssessment] = useState(
    "Grammar: weak cases. Vocabulary: okay for daily life. Speaking: nervous and short answers.",
  );
  const [plan, setPlan] = useState<DiagnosticPlan | null>(null);
  const [source, setSource] = useState<"openai" | "demo" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateDiagnostic() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/diagnostic-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, experience, selfAssessment }),
      });
      const data = (await response.json()) as ApiResult<DiagnosticPlan> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate diagnostic."));
      }

      setPlan(data.data);
      setSource(data.source);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Diagnostic failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <aside className="space-y-5">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Onboarding
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            AI diagnostic and launch path
          </h1>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Goal</span>
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="mt-2 min-h-24 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">
                German experience
              </span>
              <textarea
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                className="mt-2 min-h-28 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">
                Self assessment
              </span>
              <textarea
                value={selfAssessment}
                onChange={(event) => setSelfAssessment(event.target.value)}
                className="mt-2 min-h-32 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
              />
            </label>
            <button
              type="button"
              onClick={generateDiagnostic}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate placement
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-700" />
            <p className="text-sm font-semibold">After placement</p>
          </div>
          <div className="mt-4 grid gap-2">
            <Link
              href="/speaking-lab"
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-3 text-sm font-semibold hover:bg-neutral-50"
            >
              Speaking diagnostic
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/learn"
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-3 text-sm font-semibold hover:bg-neutral-50"
            >
              Generate first lesson
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </aside>

      <main className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {plan ? `Diagnostic result (${source})` : "AI placement"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                {plan
                  ? `${plan.estimatedLevel} recommended start`
                  : "Tell AI where the learner is starting"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
                {plan?.goalSummary ||
                  "The diagnostic creates a level estimate, weak tags, first-week path, and placement tasks. Speaking can then confirm the estimate."}
              </p>
            </div>
            <Target className="h-6 w-6 text-teal-700" />
          </div>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              AI is placing the learner and building the first week.
            </div>
          ) : null}
        </section>

        {plan ? (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              {plan.skillScores.map((score) => (
                <div key={score.skill} className="rounded-lg border border-neutral-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-neutral-700">{score.skill}</p>
                    <span className="text-2xl font-semibold">{score.score}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-neutral-200">
                    <div
                      className="h-2 rounded-full bg-teal-700"
                      style={{ width: `${score.score}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{score.reason}</p>
                </div>
              ))}
            </section>

            <section className="rounded-lg border border-teal-200 bg-teal-50 p-5">
              <p className="text-sm font-semibold text-teal-950">Recommended start</p>
              <p className="mt-2 text-sm leading-6 text-teal-950">
                {plan.recommendedStart}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {plan.weakTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-900"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <InfoPanel title="First-week plan" items={plan.firstWeekPlan} />
              <InfoPanel title="Placement tasks" items={plan.placementTasks} />
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-teal-700" />
            <h2 className="mt-4 text-xl font-semibold">Run a real onboarding diagnostic</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              This page now builds a personalized start path instead of sending every
              learner to the same static CTA.
            </p>
          </section>
        )}
      </main>
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

function readErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return fallback;
}

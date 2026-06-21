"use client";

import { ArrowRight, Loader2, Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ProgressReport } from "@/lib/ai/workspace-schemas";

type ApiResult<T> = {
  data: T;
  source: "openai" | "demo";
};

export function DashboardCoachClient({
  initialGoal = "B1 German speaking for interviews and daily life",
}: {
  initialGoal?: string;
}) {
  const [goal, setGoal] = useState(initialGoal);
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [source, setSource] = useState<"openai" | "demo" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateNextPlan() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/progress-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentGoal: goal,
          recentPractice:
            "New launch workspace with lessons, speaking lab, interview mode, exams, and weak-spot drills.",
          concerns: "Need the next best action for today.",
        }),
      });
      const data = (await response.json()) as ApiResult<ProgressReport> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate dashboard plan."));
      }

      setReport(data.data);
      setSource(data.source);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Dashboard plan generation failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-700" />
        <p className="text-sm font-semibold">
          {report ? `AI next action (${source})` : "Generate next best action"}
        </p>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold text-neutral-700">Today&apos;s goal</span>
        <input
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      <button
        type="button"
        onClick={generateNextPlan}
        disabled={loading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Build today plan
      </button>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
          {error}
        </div>
      ) : null}

      {report ? (
        <div className="mt-5 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">
              {report.estimatedLevel} focus, {report.readinessScore}% ready
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{report.summary}</p>
          </div>
          <div className="space-y-2">
            {report.nextActions.slice(0, 3).map((action) => (
              <div key={action} className="rounded-md border border-neutral-200 p-3 text-sm">
                {action}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-neutral-600">
          Use this instead of a fixed dashboard recommendation. AI will choose the next
          lesson, speaking task, or weak drill for the goal.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/speaking-lab"
          className="flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          <Mic className="h-4 w-4" />
          Practice now
        </Link>
        <Link
          href="/train/weak-spots"
          className="flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          Training plan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
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

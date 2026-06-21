"use client";

import { ArrowRight, Loader2, Mic, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { WeakSpotPlan } from "@/lib/ai/workspace-schemas";
import { cefrLevels, type CefrLevel } from "@/lib/curriculum";
import { cn } from "@/lib/utils";

type ApiResult<T> = {
  data: T;
  source: "openai" | "demo";
};

const starterAreas = [
  "Dative articles and endings",
  "Verb position in subordinate clauses",
  "Perfect tense with haben and sein",
  "Speaking fluency under exam pressure",
  "Professional interview vocabulary",
];

export function WeakSpotsClient() {
  const [level, setLevel] = useState<CefrLevel>("B1");
  const [weakArea, setWeakArea] = useState("Dative articles and word order");
  const [context, setContext] = useState(
    "I can understand examples, but when I speak I mix den, dem, and word order.",
  );
  const [plan, setPlan] = useState<WeakSpotPlan | null>(null);
  const [source, setSource] = useState<"openai" | "demo" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generatePlan(area = weakArea) {
    if (!area.trim()) {
      setError("Tell AI the weak area first.");
      return;
    }

    setWeakArea(area);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/weak-spot-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, weakArea: area, context }),
      });
      const data = (await response.json()) as ApiResult<WeakSpotPlan> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate weak spot plan."));
      }

      setPlan(data.data);
      setSource(data.source);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Weak spot generation failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-5">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Weak spot training
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Generate drills from the exact mistake
          </h1>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Level</span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as CefrLevel)}
                className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                {cefrLevels.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Weak area</span>
              <input
                value={weakArea}
                onChange={(event) => setWeakArea(event.target.value)}
                className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="articles, cases, fluency, interview answers..."
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">
                What happens when you practice?
              </span>
              <textarea
                value={context}
                onChange={(event) => setContext(event.target.value)}
                className="mt-2 min-h-32 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
                placeholder="Paste a mistake, transcript, exam feedback, or describe the problem."
              />
            </label>

            <button
              type="button"
              onClick={() => generatePlan()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Build training plan
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-700">Fast weak areas</p>
          <div className="mt-3 space-y-2">
            {starterAreas.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => generatePlan(area)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-3 text-left text-sm hover:bg-neutral-50"
              >
                <span>{area}</span>
                <ArrowRight className="h-4 w-4 text-neutral-400" />
              </button>
            ))}
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
                {plan ? `Personal plan (${source})` : "AI weak-area planner"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                {plan?.title || "No more generic drill lists"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
                {plan?.diagnosis ||
                  "Describe the weakness once. AI turns it into grammar drills, speaking prompts, retry checks, and weak tags you can carry into Speaking Lab."}
              </p>
            </div>
            <Target className="h-6 w-6 text-teal-700" />
          </div>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              AI is creating targeted drills and a speaking retry path.
            </div>
          ) : null}
        </section>

        {plan ? (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              {plan.drills.map((drill) => (
                <div
                  key={`${drill.title}-${drill.prompt}`}
                  className="rounded-lg border border-neutral-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{drill.title}</h3>
                    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
                      {drill.type}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-700">{drill.prompt}</p>
                  <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-sm font-semibold text-neutral-800">
                      {drill.modelAnswer}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {drill.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
                <div className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-teal-700" />
                  <p className="text-sm font-semibold text-teal-950">Speaking retry</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-teal-950">
                  {plan.speakingPrompt}
                </p>
                <Link
                  href="/speaking-lab"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Practice with mic
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <p className="text-sm font-semibold text-neutral-700">Weak tags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.weakTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <InfoPanel title="Review checklist" items={plan.reviewChecklist} />
              <InfoPanel title="Next actions" items={plan.nextActions} />
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
            <Target className="mx-auto h-8 w-8 text-teal-700" />
            <h2 className="mt-4 text-xl font-semibold">Generate the first weak-spot plan</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              This page now becomes useful only after the learner tells AI what is
              actually going wrong.
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
          <li key={item} className={cn(!item.trim() && "hidden")}>
            {item}
          </li>
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

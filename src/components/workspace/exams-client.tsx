"use client";

import { ArrowRight, ClipboardCheck, GraduationCap, Loader2, Mic, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ExamPractice } from "@/lib/ai/workspace-schemas";
import { cefrLevels, type CefrLevel } from "@/lib/curriculum";
import { cn } from "@/lib/utils";

type ApiResult<T> = {
  data: T;
  source: "openai" | "demo";
};

const examTypes = ["Goethe-style", "telc-style", "TestDaF-style", "Custom exam mix"];
const focusOptions = [
  "speaking and writing",
  "listening and reading",
  "interview speaking",
  "formal email writing",
  "argumentation and presentation",
];

export function ExamsClient() {
  const [level, setLevel] = useState<CefrLevel>("B1");
  const [examType, setExamType] = useState("Goethe-style");
  const [focus, setFocus] = useState("speaking and writing");
  const [practice, setPractice] = useState<ExamPractice | null>(null);
  const [source, setSource] = useState<"openai" | "demo" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generatePractice(nextFocus = focus) {
    setFocus(nextFocus);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/exam-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, examType, focus: nextFocus }),
      });
      const data = (await response.json()) as ApiResult<ExamPractice> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate exam practice."));
      }

      setPractice(data.data);
      setSource(data.source);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Exam generation failed.",
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
            Exam center
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Generate unofficial mock practice
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Tasks are AI practice material for readiness building, not official exam
            questions or grading.
          </p>

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
              <span className="text-sm font-semibold text-neutral-700">Exam type</span>
              <select
                value={examType}
                onChange={(event) => setExamType(event.target.value)}
                className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                {examTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Focus</span>
              <input
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="speaking, writing, email, presentation..."
              />
            </label>

            <button
              type="button"
              onClick={() => generatePractice()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate exam set
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-700">One-click focus</p>
          <div className="mt-3 space-y-2">
            {focusOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => generatePractice(item)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-3 text-left text-sm hover:bg-neutral-50",
                  item === focus ? "border-teal-700 bg-teal-50" : "border-neutral-200",
                )}
              >
                <span>{item}</span>
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
                {practice ? `${practice.examType} (${source})` : "AI exam generator"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                {practice?.title || "Choose level, exam, and focus"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
                Generate a fresh mock set whenever the learner changes target level,
                exam style, or weak skill.
              </p>
            </div>
            <GraduationCap className="h-6 w-6 text-teal-700" />
          </div>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              AI is creating exam sections, prompts, expected answers, and rubric.
            </div>
          ) : null}
        </section>

        {practice ? (
          <>
            <section className="grid gap-4">
              {practice.sections.map((section) => (
                <div
                  key={`${section.name}-${section.task}`}
                  className="rounded-lg border border-neutral-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                        {section.timingMinutes} minutes
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">{section.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {section.instructions}
                      </p>
                    </div>
                    <ClipboardCheck className="h-5 w-5 text-teal-700" />
                  </div>
                  <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-800">
                    {section.task}
                  </p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {section.questions.map((question) => (
                      <details
                        key={`${question.prompt}-${question.skill}`}
                        className="rounded-lg border border-neutral-200 p-4"
                      >
                        <summary className="cursor-pointer text-sm font-semibold">
                          {question.prompt}
                        </summary>
                        <p className="mt-3 text-sm font-semibold text-teal-800">
                          {question.expectedAnswer}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          {question.skill}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
                <div className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-teal-700" />
                  <p className="text-sm font-semibold text-teal-950">Speaking prompt</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-teal-950">
                  {practice.speakingPrompt}
                </p>
                <Link
                  href="/speaking-lab"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Answer with mic
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-5">
                <p className="text-sm font-semibold text-neutral-700">Writing prompt</p>
                <p className="mt-3 text-sm leading-6 text-neutral-700">
                  {practice.writingPrompt}
                </p>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <InfoPanel title="Scoring rubric" items={practice.scoringRubric} />
              <InfoPanel title="Readiness advice" items={practice.readinessAdvice} />
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
            <GraduationCap className="mx-auto h-8 w-8 text-teal-700" />
            <h2 className="mt-4 text-xl font-semibold">Generate a live mock exam set</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Static exam cards are gone from this route. The learner picks the target and
              gets a new practice set on demand.
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

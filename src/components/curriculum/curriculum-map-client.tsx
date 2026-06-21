"use client";

import { ArrowRight, BookOpenCheck, Loader2, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { CurriculumMap } from "@/lib/ai/lesson-schemas";
import { curriculumLevels, type CefrLevel } from "@/lib/curriculum";
import { cn } from "@/lib/utils";

type Source = "openai" | "demo";

type ApiResult<T> = {
  data: T;
  source: Source;
};

type CurriculumLevel = (typeof curriculumLevels)[number];

export function CurriculumMapClient() {
  const [activeLevel, setActiveLevel] = useState<CurriculumLevel>(curriculumLevels[0]);
  const [requestedFocus, setRequestedFocus] = useState(
    "speaking confidence, daily conversation, and exam readiness",
  );
  const [map, setMap] = useState<CurriculumMap | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateMap(level = activeLevel) {
    setActiveLevel(level);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/curriculum-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: level.level,
          title: level.title,
          focus: level.focus,
          requestedFocus,
        }),
      });
      const data = (await response.json()) as ApiResult<CurriculumMap> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate curriculum map."));
      }

      setMap(data.data);
      setSource(data.source);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Curriculum generation failed.",
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
            Curriculum
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            A1-C2 structured German map
          </h1>
          <label className="mt-5 block">
            <span className="text-sm font-semibold text-neutral-700">
              What do you want to learn?
            </span>
            <textarea
              value={requestedFocus}
              onChange={(event) => setRequestedFocus(event.target.value)}
              className="mt-2 min-h-28 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
              placeholder="daily speaking, German interview, visa appointment, Goethe A2..."
            />
          </label>
          <button
            type="button"
            onClick={() => generateMap()}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate {activeLevel.level} map
          </button>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-700">CEFR levels</p>
          <div className="mt-3 space-y-2">
            {curriculumLevels.map((level) => (
              <button
                key={level.level}
                type="button"
                onClick={() => generateMap(level)}
                className={cn(
                  "w-full rounded-md border px-3 py-3 text-left transition hover:bg-neutral-50",
                  level.level === activeLevel.level
                    ? "border-teal-700 bg-teal-50"
                    : "border-neutral-200",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold text-teal-800">{level.level}</span>
                  <span className="text-xs font-semibold text-neutral-500">
                    {level.lessons} mapped
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold">{level.title}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{level.focus}</p>
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
                {map ? `${map.level} generated path (${source})` : `${activeLevel.level} preview`}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                {map?.title || activeLevel.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
                {map?.learningPromise || activeLevel.focus}
              </p>
            </div>
            <Link
              href={`/learn?level=${activeLevel.level as CefrLevel}`}
              className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
            >
              Open lessons
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              AI is mapping modules, lesson ideas, assessments, and weak spots.
            </div>
          ) : null}
        </section>

        {map ? (
          <>
            <section className="grid gap-4">
              {map.modules.map((module) => (
                <div
                  key={module.id}
                  className="rounded-lg border border-neutral-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                        {module.estimatedMinutes} min
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">{module.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {module.objective}
                      </p>
                    </div>
                    <BookOpenCheck className="h-5 w-5 text-teal-700" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {module.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {module.lessonIdeas.map((lesson) => (
                      <Link
                        key={`${module.id}-${lesson.title}`}
                        href={`/learn?level=${map.level}&topic=${encodeURIComponent(lesson.topic)}`}
                        className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{lesson.title}</p>
                          <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-900">
                            {lesson.practiceType}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {lesson.outcome}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <InfoPanel title="Assessment checkpoints" items={map.assessment} />
              <InfoPanel title="Weak spot watchlist" items={map.weakSpotWatchlist} icon />
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
            <Target className="mx-auto h-8 w-8 text-teal-700" />
            <h2 className="mt-4 text-xl font-semibold">Generate a real curriculum map</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              The cards on the left are level entry points. Pick a level and tell AI what
              you want to learn; it will create modules, lesson ideas, assessments, and
              weak-spot tracking for that level.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function InfoPanel({
  title,
  items,
  icon = false,
}: {
  title: string;
  items: string[];
  icon?: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-2">
        {icon ? <Target className="h-4 w-4 text-teal-700" /> : null}
        <p className="text-sm font-semibold text-neutral-700">{title}</p>
      </div>
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

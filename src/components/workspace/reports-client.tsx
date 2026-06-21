"use client";

import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Headphones,
  Loader2,
  MessageCircle,
  Mic,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ScoreRing } from "@/components/score-ring";
import type { ProgressReport } from "@/lib/ai/workspace-schemas";
import type {
  LearnerReportEntry,
  LearnerReportsData,
  ReportEntryType,
} from "@/lib/reports";
import { cn } from "@/lib/utils";

type Filter = "all" | ReportEntryType;

type AiReportResult = {
  data: ProgressReport;
  source: "openai" | "demo";
  stored?: boolean;
  warning?: string;
};

const filters: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All evidence" },
  { value: "speaking", label: "Speaking" },
  { value: "listening", label: "Listening" },
  { value: "conversation", label: "Conversations" },
  { value: "interview", label: "Interviews" },
];

const entryMeta = {
  speaking: {
    label: "Speaking",
    icon: Mic,
    tone: "bg-rose-50 text-rose-800",
  },
  listening: {
    label: "Listening",
    icon: Headphones,
    tone: "bg-teal-50 text-teal-800",
  },
  conversation: {
    label: "Conversation",
    icon: MessageCircle,
    tone: "bg-blue-50 text-blue-800",
  },
  interview: {
    label: "Interview",
    icon: BriefcaseBusiness,
    tone: "bg-amber-50 text-amber-800",
  },
} satisfies Record<
  ReportEntryType,
  { label: string; icon: typeof Mic; tone: string }
>;

export function ReportsClient({
  initialData,
}: {
  initialData: LearnerReportsData;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [aiReport, setAiReport] = useState(
    initialData.latestAiReport?.report || null,
  );
  const [aiSource, setAiSource] = useState<"openai" | "demo" | null>(
    initialData.latestAiReport?.source || null,
  );
  const [aiGeneratedAt, setAiGeneratedAt] = useState(
    initialData.latestAiReport?.createdAt || "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveWarning, setSaveWarning] = useState("");

  const visibleEntries = useMemo(
    () =>
      filter === "all"
        ? initialData.entries
        : initialData.entries.filter((entry) => entry.type === filter),
    [filter, initialData.entries],
  );

  async function refreshAiReport() {
    setLoading(true);
    setError("");
    setSaveWarning("");

    try {
      const response = await fetch("/api/ai/progress-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useSavedData: true }),
      });
      const data = (await response.json()) as AiReportResult | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(
          readErrorMessage(data, "Could not refresh the saved-data report."),
        );
      }

      setAiReport(data.data);
      setAiSource(data.source);
      setAiGeneratedAt(new Date().toISOString());
      setSaveWarning(data.warning || "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Report generation failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Learner reports
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Evidence from your completed practice
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
              This page reads saved speaking feedback, listening answers, lesson
              conversations, and interview reports. You do not need to describe your
              own progress.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshAiReport}
            disabled={loading || !initialData.entries.length}
            className="flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh AI analysis
          </button>
        </div>
      </section>

      {error ? (
        <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <p>{error}</p>
        </div>
      ) : null}

      {saveWarning ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          The analysis was generated, but its snapshot could not be saved:{" "}
          {saveWarning}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Completed practice"
          value={String(initialData.practiceCount)}
          detail="Saved assessed activities"
        />
        <Metric
          label="Average result"
          value={
            initialData.averageScore === null
              ? "New"
              : `${initialData.averageScore}%`
          }
          detail="Across scored saved reports"
        />
        <Metric
          label="Measured skills"
          value={String(initialData.skills.length)}
          detail="From real assessment results"
        />
        <Metric
          label="Recurring weak tags"
          value={String(initialData.weakTags.length)}
          detail={
            initialData.weakTags[0]
              ? `Top: ${initialData.weakTags[0].tag}`
              : "No repeated weak tags yet"
          }
        />
      </section>

      {aiReport ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-700" />
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Saved-evidence AI analysis ({aiSource})
                </p>
              </div>
              <h2 className="mt-2 text-2xl font-semibold">
                {aiReport.estimatedLevel} estimate · {aiReport.readinessScore}%
                readiness
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-700">
                {aiReport.summary}
              </p>
            </div>
            {aiGeneratedAt ? (
              <p className="flex items-center gap-2 text-xs text-neutral-500">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDate(aiGeneratedAt)}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[280px_1fr]">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
              <ScoreRing
                score={aiReport.readinessScore}
                label="Readiness"
                accent="#0f766e"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <InfoPanel title="Wins" items={aiReport.wins} />
              <InfoPanel title="Risks" items={aiReport.risks} />
              <InfoPanel title="Next actions" items={aiReport.nextActions} />
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-teal-700" />
            <div>
              <h2 className="font-semibold">No AI progress snapshot yet</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Once assessed practice exists, “Refresh AI analysis” summarizes only
                the evidence saved below. It never asks you to invent recent practice
                or concerns.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Skill profile
              </p>
              <h2 className="mt-1 text-2xl font-semibold">Latest measured scores</h2>
            </div>
            <BarChart3 className="h-5 w-5 text-teal-700" />
          </div>

          {initialData.skills.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {initialData.skills.map((skill) => (
                <div
                  key={skill.skill}
                  className="rounded-lg border border-neutral-200 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{skill.skill}</p>
                        {skill.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-teal-700" />
                        ) : skill.trend === "down" ? (
                          <TrendingDown className="h-4 w-4 text-rose-700" />
                        ) : (
                          <span className="h-1.5 w-5 rounded-full bg-neutral-300" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {skill.level ? `${skill.level} · ` : ""}
                        {skill.samples} saved sample
                        {skill.samples === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="text-xl font-semibold">{skill.score}%</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-neutral-200">
                    <div
                      className="h-2 rounded-full bg-teal-700"
                      style={{ width: `${skill.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyEvidence />
          )}
        </div>

        <aside className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-rose-700" />
            <p className="text-sm font-semibold">Recurring weak tags</p>
          </div>
          {initialData.weakTags.length ? (
            <div className="mt-4 space-y-3">
              {initialData.weakTags.map((item) => (
                <div
                  key={item.tag}
                  className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2.5"
                >
                  <span className="text-sm font-medium">{item.tag}</span>
                  <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              Weak tags will appear after saved feedback identifies recurring issues.
            </p>
          )}
        </aside>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Assessment history
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Tests, answers, corrections, and feedback
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  filter === item.value
                    ? "border-teal-700 bg-teal-50 text-teal-900"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {visibleEntries.length ? (
          <div className="mt-5 space-y-4">
            {visibleEntries.map((entry) => (
              <ReportEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <EmptyEvidence />
        )}
      </section>
    </div>
  );
}

function ReportEntryCard({ entry }: { entry: LearnerReportEntry }) {
  const meta = entryMeta[entry.type];
  const Icon = meta.icon;

  return (
    <details className="group rounded-lg border border-neutral-200 bg-white">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("rounded-md p-2", meta.tone)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{entry.title}</p>
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
                {entry.level}
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                {meta.label}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
              {entry.summary}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              {formatDate(entry.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-none items-center gap-3">
          {typeof entry.score === "number" ? (
            <span className="text-xl font-semibold text-teal-800">
              {entry.score}%
            </span>
          ) : null}
          <ChevronDown className="h-5 w-5 text-neutral-400 transition group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-neutral-200 p-4">
        {entry.scores.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {entry.scores.map((score) => (
              <div
                key={`${entry.id}-${score.label}`}
                className="rounded-md border border-neutral-200 bg-neutral-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-neutral-600">
                    {score.label}
                  </p>
                  <span className="font-semibold">{score.score}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-neutral-200">
                  <div
                    className="h-1.5 rounded-full bg-teal-700"
                    style={{ width: `${score.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {entry.questionReviews.length ? (
          <DetailSection title="Answer review">
            <div className="space-y-3">
              {entry.questionReviews.map((question, index) => (
                <div
                  key={`${entry.id}-question-${index}`}
                  className={cn(
                    "rounded-md border p-3",
                    question.isCorrect
                      ? "border-teal-200 bg-teal-50"
                      : "border-rose-200 bg-rose-50",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {question.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-teal-700" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-rose-700" />
                    )}
                    <div>
                      <p className="text-sm font-semibold">{question.prompt}</p>
                      <p className="mt-2 text-sm">
                        Your answer: {question.selected || "No answer"}
                      </p>
                      {!question.isCorrect ? (
                        <p className="mt-1 text-sm font-semibold">
                          Correct answer: {question.correct}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs leading-5 text-neutral-600">
                        {question.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>
        ) : null}

        {entry.transcript || entry.correctedText ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {entry.transcript ? (
              <TextPanel title="Learner evidence" value={entry.transcript} />
            ) : null}
            {entry.correctedText ? (
              <TextPanel title="Corrected German" value={entry.correctedText} />
            ) : null}
          </div>
        ) : null}

        {entry.corrections.length ? (
          <DetailSection title="Corrections">
            <div className="grid gap-3 lg:grid-cols-2">
              {entry.corrections.map((correction, index) => (
                <div
                  key={`${entry.id}-correction-${index}`}
                  className="rounded-md border border-neutral-200 p-3"
                >
                  {correction.original ? (
                    <p className="text-sm text-rose-800">
                      {correction.original}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm font-semibold text-teal-900">
                    {correction.corrected}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-neutral-600">
                    {correction.explanation}
                  </p>
                </div>
              ))}
            </div>
          </DetailSection>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <InfoPanel title="Strengths" items={entry.strengths} />
          <InfoPanel title="Improve" items={entry.improvements} />
          <InfoPanel title="Next actions" items={entry.nextActions} />
        </div>

        {entry.weakTags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.weakTags.map((tag) => (
              <span
                key={`${entry.id}-${tag}`}
                className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm font-semibold text-neutral-600">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-neutral-500">{detail}</p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4">
      <p className="mb-3 text-sm font-semibold text-neutral-700">{title}</p>
      {children}
    </section>
  );
}

function TextPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-800">
        {value}
      </p>
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
          {items.slice(0, 8).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">No items recorded.</p>
      )}
    </div>
  );
}

function EmptyEvidence() {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-neutral-300 p-6 text-center">
      <BarChart3 className="mx-auto h-7 w-7 text-teal-700" />
      <p className="mt-3 text-sm font-semibold">No matching saved evidence yet</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">
        Complete an assessed activity and its scores, answers, corrections, and
        feedback will appear here.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          href="/speaking-lab"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          Speaking Lab
        </Link>
        <Link
          href="/listening-lab"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          Listening Lab
        </Link>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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

"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Headphones,
  Loader2,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  ListeningExercise,
  ListeningReport,
} from "@/lib/ai/listening-schemas";
import { cefrLevels, type CefrLevel } from "@/lib/curriculum";
import { cn } from "@/lib/utils";

type Source = "openai" | "demo";
type LabStatus = "idle" | "generating" | "ready" | "grading" | "complete";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type ApiResult<T> = {
  data: T;
  source: Source;
};

type GradingResult = {
  correctCount: number;
  totalQuestions: number;
  score: number;
  results: Array<{
    questionId: string;
    skill: string;
    selectedOption: string;
    correctOption: string;
    correct: boolean;
  }>;
};

type ReportResponse = ApiResult<ListeningReport> & {
  grading: GradingResult;
};

const formats: Array<{
  value: ListeningExercise["format"];
  label: string;
  description: string;
}> = [
  { value: "dialogue", label: "Dialogue", description: "Two-person everyday exchange" },
  {
    value: "announcement",
    label: "Announcement",
    description: "Station, event, or public information",
  },
  {
    value: "interview",
    label: "Interview",
    description: "Work, study, or personal interview",
  },
  { value: "story", label: "Story", description: "Narrative with sequence and detail" },
  { value: "news", label: "News", description: "Structured report for advanced levels" },
];

const starterTopics = [
  "Daily life and appointments",
  "Travel and transport",
  "German job interview",
  "Workplace communication",
  "University and study",
  "Health and pharmacy",
];

export function ListeningLabClient() {
  const [level, setLevel] = useState<CefrLevel>("B1");
  const [topic, setTopic] = useState("Daily life and appointments");
  const [format, setFormat] =
    useState<ListeningExercise["format"]>("dialogue");
  const [questionCount, setQuestionCount] = useState(5);
  const [exercise, setExercise] = useState<ListeningExercise | null>(null);
  const [exerciseSource, setExerciseSource] = useState<Source | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [report, setReport] = useState<ListeningReport | null>(null);
  const [reportSource, setReportSource] = useState<Source | null>(null);
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [status, setStatus] = useState<LabStatus>("idle");
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [listenCount, setListenCount] = useState(0);
  const [sessionId, setSessionId] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const audioUrlRef = useRef("");

  const answeredCount = Object.keys(answers).length;
  const allAnswered = Boolean(
    exercise &&
      exercise.questions.every((question) => Boolean(answers[question.id])),
  );
  const resultByQuestion = useMemo(
    () =>
      new Map(
        (grading?.results || []).map((result) => [result.questionId, result]),
      ),
    [grading?.results],
  );

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function generateExercise() {
    if (!topic.trim()) {
      setError("Choose or enter a listening topic first.");
      return;
    }

    revokeAudioUrl();
    window.speechSynthesis?.cancel();
    setStatus("generating");
    setError("");
    setAudioError("");
    setExercise(null);
    setExerciseSource(null);
    setAnswers({});
    setReport(null);
    setReportSource(null);
    setGrading(null);
    setListenCount(0);
    setSessionId("");
    setSaveStatus("idle");
    setSaveMessage("");

    try {
      const response = await fetch("/api/ai/listening-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, topic, format, questionCount }),
      });
      const data = (await response.json()) as
        | ApiResult<ListeningExercise>
        | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(
          readErrorMessage(data, "Could not generate the listening exercise."),
        );
      }

      setExercise(data.data);
      setExerciseSource(data.source);
      setStatus("ready");

      await Promise.all([
        generateAudio(data.data),
        persistGeneratedExercise(data.data, data.source),
      ]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Listening exercise generation failed.",
      );
      setStatus("idle");
    }
  }

  async function generateAudio(nextExercise: ListeningExercise) {
    setAudioLoading(true);
    setAudioError("");

    try {
      const response = await fetch("/api/ai/listening-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: nextExercise.transcriptGerman,
          level: nextExercise.level,
          format: nextExercise.format,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Could not generate listening audio.");
      }

      const nextUrl = URL.createObjectURL(await response.blob());
      revokeAudioUrl();
      audioUrlRef.current = nextUrl;
      setAudioUrl(nextUrl);
    } catch (caughtError) {
      setAudioError(
        caughtError instanceof Error
          ? `${caughtError.message} Use the browser voice fallback below.`
          : "Audio generation failed. Use the browser voice fallback below.",
      );
    } finally {
      setAudioLoading(false);
    }
  }

  async function persistGeneratedExercise(
    nextExercise: ListeningExercise,
    source: Source,
  ) {
    setSaveStatus("saving");
    setSaveMessage("Saving generated exercise...");

    try {
      const response = await fetch("/api/listening-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise: nextExercise, source }),
      });
      const data = (await response.json()) as {
        stored?: boolean;
        sessionId?: string;
        reason?: string;
      };

      if (!response.ok || !data.stored || !data.sessionId) {
        throw new Error(data.reason || "Exercise could not be saved.");
      }

      setSessionId(data.sessionId);
      setSaveStatus("saved");
      setSaveMessage("Exercise saved. Your answers will update this session.");
    } catch (caughtError) {
      setSaveStatus("error");
      setSaveMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Exercise could not be saved.",
      );
    }
  }

  async function submitAnswers() {
    if (!exercise || !allAnswered) {
      setError("Answer every question before generating the report.");
      return;
    }

    setStatus("grading");
    setError("");

    try {
      const response = await fetch("/api/ai/listening-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise, answers }),
      });
      const data = (await response.json()) as ReportResponse | { error?: string };

      if (!response.ok || !("data" in data) || !("grading" in data)) {
        throw new Error(
          readErrorMessage(data, "Could not generate the listening report."),
        );
      }

      setReport(data.data);
      setReportSource(data.source);
      setGrading(data.grading);
      setStatus("complete");
      await persistCompletedExercise(data.data, data.source);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Listening report generation failed.",
      );
      setStatus("ready");
    }
  }

  async function persistCompletedExercise(
    nextReport: ListeningReport,
    source: Source,
  ) {
    if (!exercise) return;

    if (!sessionId) {
      setSaveStatus("error");
      setSaveMessage(
        "The report is ready, but the generated exercise was not saved. Generate a new exercise after checking Supabase.",
      );
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("Saving answers and report...");

    try {
      const response = await fetch("/api/listening-sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          exercise,
          answers,
          report: nextReport,
          source,
        }),
      });
      const data = (await response.json()) as {
        stored?: boolean;
        reason?: string;
        warnings?: string[];
      };

      if (!response.ok || !data.stored) {
        throw new Error(data.reason || "Listening report could not be saved.");
      }

      setSaveStatus("saved");
      setSaveMessage(
        data.warnings?.length
          ? `Report saved, but profile updates need attention: ${data.warnings.join(" ")}`
          : "Answers, score, weak tags, and report are saved.",
      );
    } catch (caughtError) {
      setSaveStatus("error");
      setSaveMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Listening report could not be saved.",
      );
    }
  }

  function playBrowserFallback() {
    if (!exercise || !("speechSynthesis" in window)) {
      setAudioError("Browser text-to-speech is unavailable.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(exercise.transcriptGerman);
    utterance.lang = "de-DE";
    utterance.rate =
      exercise.level === "A1" ? 0.78 : exercise.level === "A2" ? 0.84 : 0.92;
    utterance.onstart = () => setListenCount((current) => current + 1);
    utterance.onerror = () =>
      setAudioError("The browser voice could not play this exercise.");
    window.speechSynthesis.speak(utterance);
  }

  function resetLab() {
    revokeAudioUrl();
    window.speechSynthesis?.cancel();
    setExercise(null);
    setExerciseSource(null);
    setAnswers({});
    setReport(null);
    setReportSource(null);
    setGrading(null);
    setStatus("idle");
    setError("");
    setAudioError("");
    setListenCount(0);
    setSessionId("");
    setSaveStatus("idle");
    setSaveMessage("");
  }

  function revokeAudioUrl() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    setAudioUrl("");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-5">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-700 text-white">
              <Headphones className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                Listening Lab
              </p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Hören and understand
              </h1>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">
                CEFR level
              </span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as CefrLevel)}
                disabled={status === "generating" || status === "grading"}
                className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
              >
                {cefrLevels.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Topic</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                disabled={status === "generating" || status === "grading"}
                className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60"
                placeholder="travel, interview, daily life..."
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">
                Questions
              </span>
              <select
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                disabled={status === "generating" || status === "grading"}
                className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
              >
                {[3, 4, 5, 6, 7, 8].map((count) => (
                  <option key={count} value={count}>
                    {count} questions
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={generateExercise}
            disabled={status === "generating" || status === "grading"}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "generating" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate listening
          </button>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-700">Audio format</p>
          <div className="mt-3 space-y-2">
            {formats.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFormat(item.value)}
                disabled={status === "generating" || status === "grading"}
                className={cn(
                  "w-full rounded-md border px-3 py-3 text-left transition disabled:opacity-60",
                  format === item.value
                    ? "border-teal-700 bg-teal-50"
                    : "border-neutral-200 hover:bg-neutral-50",
                )}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-neutral-600">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-700">Quick topics</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {starterTopics.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-teal-300 hover:bg-teal-50"
              >
                {item}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="space-y-5">
        {error ? (
          <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <p>{error}</p>
          </div>
        ) : null}

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {exercise
                  ? `${exercise.level} ${exercise.format} (${exerciseSource})`
                  : "Generated listening assessment"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                {exercise?.title || "Choose a level and generate a Hörverstehen task"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
                {exercise?.situation ||
                  "The German transcript stays hidden while you listen. Answer the MCQs, then unlock the transcript, explanations, skill scores, and training report."}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold">
              <Headphones className="h-4 w-4 text-teal-700" />
              {listenCount} listens
            </div>
          </div>

          {status === "generating" ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              AI is writing the German audio script and comprehension questions.
            </div>
          ) : null}
        </section>

        {exercise ? (
          <>
            <section className="rounded-lg border border-teal-200 bg-teal-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-teal-700" />
                    <p className="text-sm font-semibold text-teal-950">
                      Listening audio
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-teal-950">
                    {exercise.instructions} Estimated length:{" "}
                    {exercise.durationEstimateSeconds} seconds.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-900">
                  AI-generated voice
                </span>
              </div>

              {audioLoading ? (
                <div className="mt-5 flex items-center gap-3 rounded-lg bg-white p-4 text-sm text-neutral-700">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                  Generating the German audio...
                </div>
              ) : audioUrl ? (
                <audio
                  src={audioUrl}
                  controls
                  preload="metadata"
                  controlsList="nodownload"
                  onPlay={() => setListenCount((current) => current + 1)}
                  className="mt-5 w-full"
                >
                  Your browser does not support audio playback.
                </audio>
              ) : null}

              {audioError ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  {audioError}
                </div>
              ) : null}

              <button
                type="button"
                onClick={playBrowserFallback}
                className="mt-4 flex items-center gap-2 rounded-md border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-teal-950 hover:bg-teal-100"
              >
                <Play className="h-4 w-4" />
                Play with browser voice
              </button>
            </section>

            <section className="space-y-4">
              {exercise.questions.map((question, index) => {
                const selected = answers[question.id];
                const questionResult = resultByQuestion.get(question.id);

                return (
                  <div
                    key={question.id}
                    className="rounded-lg border border-neutral-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                          Question {index + 1} · {question.skill.replace("-", " ")}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold">
                          {question.prompt}
                        </h3>
                      </div>
                      {questionResult ? (
                        questionResult.correct ? (
                          <CheckCircle2 className="h-5 w-5 flex-none text-teal-700" />
                        ) : (
                          <XCircle className="h-5 w-5 flex-none text-rose-700" />
                        )
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-2">
                      {question.options.map((option) => {
                        const isCorrect =
                          status === "complete" &&
                          option === question.correctOption;
                        const isIncorrectSelection =
                          status === "complete" &&
                          option === selected &&
                          option !== question.correctOption;

                        return (
                          <label
                            key={option}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-sm transition",
                              selected === option &&
                                status !== "complete" &&
                                "border-teal-700 bg-teal-50",
                              !selected &&
                                status !== "complete" &&
                                "border-neutral-200 hover:bg-neutral-50",
                              selected !== option &&
                                status !== "complete" &&
                                "border-neutral-200",
                              isCorrect && "border-teal-300 bg-teal-50",
                              isIncorrectSelection && "border-rose-300 bg-rose-50",
                            )}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option}
                              checked={selected === option}
                              disabled={status === "grading" || status === "complete"}
                              onChange={() =>
                                setAnswers((current) => ({
                                  ...current,
                                  [question.id]: option,
                                }))
                              }
                              className="mt-0.5"
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>

                    {status === "complete" ? (
                      <div className="mt-4 rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
                        <span className="font-semibold">
                          Correct answer: {question.correctOption}.
                        </span>{" "}
                        {question.explanation}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>

            {status !== "complete" ? (
              <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-5">
                <div>
                  <p className="text-sm font-semibold">
                    {answeredCount}/{exercise.questions.length} answered
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    The transcript and answer explanations unlock after submission.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={submitAnswers}
                  disabled={!allAnswered || status === "grading"}
                  className="flex items-center gap-2 rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "grading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                  Grade and create report
                </button>
              </section>
            ) : null}

            {report ? (
              <>
                <section className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  <div className="rounded-lg border border-neutral-200 bg-white p-5 text-center">
                    <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                      Listening score
                    </p>
                    <p className="mt-4 text-6xl font-semibold text-teal-800">
                      {report.score}%
                    </p>
                    <p className="mt-3 text-sm text-neutral-600">
                      {report.correctCount}/{report.totalQuestions} correct ·{" "}
                      {report.estimatedLevel} estimate
                    </p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                          AI listening report ({reportSource})
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold">
                          What you understood
                        </h2>
                      </div>
                      <BarChart3 className="h-6 w-6 text-teal-700" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-neutral-700">
                      {report.summary}
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {report.skillScores.map((skill) => (
                        <div
                          key={skill.skill}
                          className="rounded-lg border border-neutral-200 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold capitalize">
                              {skill.skill}
                            </p>
                            <span className="font-semibold">{skill.score}%</span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-neutral-200">
                            <div
                              className="h-2 rounded-full bg-teal-700"
                              style={{ width: `${skill.score}%` }}
                            />
                          </div>
                          <p className="mt-3 text-xs leading-5 text-neutral-600">
                            {skill.feedback}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                  <InfoPanel title="Strengths" items={report.strengths} />
                  <InfoPanel
                    title="Improve next"
                    items={report.improvementAreas}
                  />
                  <InfoPanel title="Next actions" items={report.nextActions} />
                </section>

                <section className="rounded-lg border border-neutral-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-5 w-5 text-teal-700" />
                    <p className="text-sm font-semibold">Transcript revealed</p>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-neutral-800">
                    {exercise.transcriptGerman}
                  </p>
                </section>

                <section className="rounded-lg border border-neutral-200 bg-white p-5">
                  <p className="text-sm font-semibold">Vocabulary from the audio</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {exercise.vocabularyAfterAnswer.map((item) => (
                      <div
                        key={item.german}
                        className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                      >
                        <p className="font-semibold text-teal-900">{item.german}</p>
                        <p className="mt-1 text-sm text-neutral-700">{item.english}</p>
                        <p className="mt-2 text-xs leading-5 text-neutral-500">
                          {item.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}

            <section
              className={cn(
                "flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4",
                saveStatus === "error"
                  ? "border-amber-200 bg-amber-50"
                  : "border-neutral-200 bg-white",
              )}
            >
              <div className="flex items-start gap-3">
                {saveStatus === "saving" ? (
                  <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-teal-700" />
                ) : (
                  <Save className="mt-0.5 h-4 w-4 text-teal-700" />
                )}
                <div>
                  <p className="text-sm font-semibold">Persistence</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-600">
                    {saveMessage || "This exercise has not been saved yet."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetLab}
                className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                <RotateCcw className="h-4 w-4" />
                New exercise
              </button>
            </section>
          </>
        ) : (
          <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
            <Headphones className="mx-auto h-9 w-9 text-teal-700" />
            <h2 className="mt-4 text-xl font-semibold">
              Generate your first listening task
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Pick A1–C2, choose a realistic audio format, and get a fresh German
              listening assessment with MCQs and a saved learning report.
            </p>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Guardrail
            icon={<Clock3 className="h-4 w-4" />}
            title="Level matched"
            detail="Length, pace, vocabulary, and question difficulty follow the selected CEFR level."
          />
          <Guardrail
            icon={<Headphones className="h-4 w-4" />}
            title="Listen first"
            detail="The transcript remains hidden until the answers are graded."
          />
          <Guardrail
            icon={<Save className="h-4 w-4" />}
            title="Saved progress"
            detail="Completed reports add listening skill scores and weak tags to the learner profile."
          />
        </section>
      </main>
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">
          No additional issues were identified.
        </p>
      )}
    </div>
  );
}

function Guardrail({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 text-teal-700">
        {icon}
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-neutral-600">{detail}</p>
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

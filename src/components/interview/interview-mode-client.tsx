"use client";

import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileAudio,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SpeechPlaybackControls } from "@/components/audio/speech-playback-controls";
import { useSpeechPlayback } from "@/hooks/use-speech-playback";
import { convertRecordingToWav } from "@/lib/audio-recording";
import type {
  InterviewAnswerFeedback,
  InterviewFinalReport,
  InterviewProfileAnalysis,
  InterviewQuestion,
  InterviewQuestionSet,
} from "@/lib/ai/interview-schemas";
import { cefrLevels, type CefrLevel } from "@/lib/curriculum";
import { cn } from "@/lib/utils";

type Source = "openai" | "demo";
type InterviewMode = "listen" | "read";
type RecordingStatus = "idle" | "requesting" | "recording" | "processing";

type ApiResult<T> = {
  data: T;
  source: Source;
};

type StoredAnswer = {
  question: InterviewQuestion;
  transcript: string;
  feedback: InterviewAnswerFeedback;
  source: Source;
  analysisBasis: "audio" | "transcript";
  audioWarning?: string;
};

const demoJobDescription =
  "We are hiring a German-speaking Customer Success Specialist to onboard customers, explain product workflows, solve support issues, and collaborate with sales and product teams. German B2 preferred.";

const demoResume =
  "Customer support professional with 3 years of experience handling client questions, onboarding users, documenting issues, and improving response quality. Learning German and preparing for customer-facing roles.";

const categoryLabels: Record<InterviewQuestion["category"], string> = {
  hr: "HR",
  behavioral: "Behavioral",
  technical: "Technical",
  "role-fit": "Role fit",
  "culture-fit": "Culture fit",
};

export function InterviewModeClient() {
  const [jobDescription, setJobDescription] = useState(demoJobDescription);
  const [resume, setResume] = useState(demoResume);
  const [targetLevel, setTargetLevel] = useState<CefrLevel>("B1");
  const [interviewType, setInterviewType] = useState(
    "mixed HR + behavioral + role-specific",
  );
  const [questionCount, setQuestionCount] = useState(8);
  const [questionMode, setQuestionMode] = useState<InterviewMode>("listen");
  const [analysis, setAnalysis] = useState<InterviewProfileAnalysis | null>(null);
  const [questionSet, setQuestionSet] = useState<InterviewQuestionSet | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StoredAnswer>>({});
  const [transcript, setTranscript] = useState("");
  const [finalReport, setFinalReport] = useState<InterviewFinalReport | null>(null);
  const [finalReportSource, setFinalReportSource] = useState<Source | null>(null);
  const [kitSource, setKitSource] = useState<Source | null>(null);
  const [loadingKit, setLoadingKit] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [analysisBasis, setAnalysisBasis] = useState<
    "audio" | "transcript" | null
  >(null);
  const [audioWarning, setAudioWarning] = useState("");
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingUrlRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechPlayback = useSpeechPlayback({ rate: 0.88 });

  const questions = useMemo(
    () => questionSet?.questions || [],
    [questionSet?.questions],
  );
  const activeQuestion = questions[activeIndex] || null;
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] : null;
  const answeredCount = Object.keys(answers).length;
  const busy =
    loadingKit ||
    loadingReport ||
    recordingStatus === "requesting" ||
    recordingStatus === "processing";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (
        recorderRef.current &&
        recorderRef.current.state !== "inactive"
      ) {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingUrlRef.current) {
        URL.revokeObjectURL(recordingUrlRef.current);
      }
    };
  }, []);

  async function generateInterviewKit() {
    speechPlayback.stop();
    stopRecordingResources();
    resetCurrentRecording();
    setLoadingKit(true);
    setError("");
    setAnalysis(null);
    setQuestionSet(null);
    setAnswers({});
    setFinalReport(null);
    setTranscript("");
    setActiveIndex(0);

    try {
      const setup = {
        jobDescription,
        resume,
        targetLevel,
        interviewType,
        questionCount,
      };
      const analysisResponse = await fetch("/api/ai/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setup),
      });
      const analysisData = (await analysisResponse.json()) as
        | ApiResult<InterviewProfileAnalysis>
        | { error?: string };

      if (!analysisResponse.ok || !("data" in analysisData)) {
        throw new Error(readErrorMessage(analysisData, "Profile analysis failed."));
      }

      setAnalysis(analysisData.data);
      setKitSource(analysisData.source);

      const questionsResponse = await fetch("/api/ai/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...setup, analysis: analysisData.data }),
      });
      const questionsData = (await questionsResponse.json()) as
        | ApiResult<InterviewQuestionSet>
        | { error?: string };

      if (!questionsResponse.ok || !("data" in questionsData)) {
        throw new Error(
          readErrorMessage(questionsData, "Question generation failed."),
        );
      }

      setQuestionSet(questionsData.data);
      setKitSource(questionsData.source);
      setActiveIndex(0);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Interview kit generation failed.",
      );
    } finally {
      setLoadingKit(false);
    }
  }

  async function startRecording() {
    if (!activeQuestion || !analysis) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record a microphone answer. Upload audio instead.");
      return;
    }

    speechPlayback.stop();
    resetCurrentRecording();
    setRecordingStatus("requesting");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = preferredRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.start(1000);
      setRecordingStatus("recording");
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
    } catch (caughtError) {
      stopRecordingResources();
      setRecordingStatus("idle");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Microphone recording could not start.",
      );
    }
  }

  async function stopAndAnalyzeRecording() {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") return;

    setRecordingStatus("processing");
    clearRecordingTimer();

    try {
      const stopped = new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
      });
      recorder.stop();
      await stopped;

      const rawRecording = new Blob(chunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      stopRecordingResources();
      const wavFile = await convertRecordingToWav(rawRecording);
      setRecordingPreview(wavFile);
      await analyzeAnswerAudio(wavFile);
    } catch (caughtError) {
      stopRecordingResources();
      setRecordingStatus("idle");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The recorded answer could not be analyzed.",
      );
    }
  }

  async function handleAudioUpload(file: File | null) {
    if (!file || !activeQuestion || !analysis) return;
    speechPlayback.stop();
    stopRecordingResources();
    resetCurrentRecording();
    setRecordingPreview(file);
    await analyzeAnswerAudio(file);
  }

  async function analyzeAnswerAudio(file: File) {
    if (!analysis || !activeQuestion) return;

    setRecordingStatus("processing");
    setError("");
    setTranscript("");
    setAnalysisBasis(null);
    setAudioWarning("");

    const formData = new FormData();
    formData.append("audio", file, file.name || "interview-answer.wav");
    formData.append("question", JSON.stringify(activeQuestion));
    formData.append("analysis", JSON.stringify(analysis));
    formData.append("jobDescription", jobDescription);
    formData.append("resume", resume);
    formData.append("targetLevel", targetLevel);
    formData.append("interviewType", interviewType);
    formData.append("questionCount", String(questionCount));

    try {
      const response = await fetch("/api/ai/interview/transcribe-answer", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as
        | (ApiResult<InterviewAnswerFeedback> & {
            transcript: string;
            analysisBasis: "audio" | "transcript";
            audioWarning?: string;
          })
        | { error?: string };

      if (
        !response.ok ||
        !("data" in data) ||
        !("transcript" in data) ||
        !data.transcript
      ) {
        throw new Error(readErrorMessage(data, "Answer analysis failed."));
      }

      const stored: StoredAnswer = {
        question: activeQuestion,
        transcript: data.transcript,
        feedback: data.data,
        source: data.source,
        analysisBasis: data.analysisBasis,
        audioWarning: data.audioWarning,
      };
      setTranscript(data.transcript);
      setAnalysisBasis(data.analysisBasis);
      setAudioWarning(data.audioWarning || "");
      setAnswers((current) => ({
        ...current,
        [activeQuestion.id]: stored,
      }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Answer analysis failed.",
      );
    } finally {
      setRecordingStatus("idle");
    }
  }

  function moveToQuestion(index: number) {
    if (recordingStatus === "recording" || recordingStatus === "processing") return;
    speechPlayback.stop();
    resetCurrentRecording();
    setActiveIndex(index);
    const next = questions[index];
    const stored = next ? answers[next.id] : null;
    setTranscript(stored?.transcript || "");
    setAnalysisBasis(stored?.analysisBasis || null);
    setAudioWarning(stored?.audioWarning || "");
  }

  function resetAnswer() {
    speechPlayback.stop();
    resetCurrentRecording();
    if (!activeQuestion) return;
    setAnswers((current) => {
      const next = { ...current };
      delete next[activeQuestion.id];
      return next;
    });
  }

  async function generateFinalReport() {
    if (!analysis || !questionSet) {
      setError("Generate an interview kit before creating a report.");
      return;
    }

    const answerList = Object.values(answers);
    if (!answerList.length) {
      setError("Record and analyze at least one answer before completing the interview.");
      return;
    }

    setLoadingReport(true);
    setError("");

    try {
      const response = await fetch("/api/ai/interview/final-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          resume,
          targetLevel,
          interviewType,
          questionCount,
          analysis,
          questionSet,
          answers: answerList.map(({ question, transcript, feedback }) => ({
            question,
            transcript,
            feedback,
          })),
        }),
      });
      const data = (await response.json()) as
        | ApiResult<InterviewFinalReport>
        | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Final report failed."));
      }

      setFinalReport(data.data);
      setFinalReportSource(data.source);
      await persistSession(data.data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Final report failed.",
      );
    } finally {
      setLoadingReport(false);
    }
  }

  async function persistSession(report: InterviewFinalReport) {
    if (!analysis || !questionSet) return;

    await fetch("/api/interview-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        jobDescription,
        resume,
        targetLevel,
        interviewType,
        questionCount,
        questionMode,
        analysis,
        questionSet,
        answers: Object.values(answers),
        report,
      }),
    }).catch(() => undefined);
  }

  function resetCurrentRecording() {
    revokeRecordingUrl();
    setTranscript("");
    setAnalysisBasis(null);
    setAudioWarning("");
    setRecordingSeconds(0);
  }

  function setRecordingPreview(file: File) {
    revokeRecordingUrl();
    const url = URL.createObjectURL(file);
    recordingUrlRef.current = url;
    setRecordingUrl(url);
  }

  function revokeRecordingUrl() {
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = "";
    }
    setRecordingUrl("");
  }

  function stopRecordingResources() {
    clearRecordingTimer();
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive" &&
      recordingStatus !== "processing"
    ) {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    chunksRef.current = [];
  }

  function clearRecordingTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-700 text-white">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                Interview Lab
              </p>
              <h1 className="text-3xl font-semibold tracking-normal">
                German interview practice
              </h1>
            </div>
          </div>
          <div className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold">
            {answeredCount}/{questions.length || questionCount} answered
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          Hear or read one question, record your complete answer without interruption,
          then let AI analyze the actual audio and transcript.
        </p>
      </section>

      {error ? (
        <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="grid gap-5 rounded-lg border border-neutral-200 bg-white p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">
              Job description
            </span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              disabled={busy || recordingStatus === "recording"}
              className="mt-2 min-h-48 w-full resize-y rounded-lg border border-neutral-300 p-3 text-sm leading-6 disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">
              Resume
            </span>
            <textarea
              value={resume}
              onChange={(event) => setResume(event.target.value)}
              disabled={busy || recordingStatus === "recording"}
              className="mt-2 min-h-48 w-full resize-y rounded-lg border border-neutral-300 p-3 text-sm leading-6 disabled:opacity-60"
            />
          </label>
        </div>

        <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">
              Target level
            </span>
            <select
              value={targetLevel}
              onChange={(event) => setTargetLevel(event.target.value as CefrLevel)}
              disabled={busy || recordingStatus === "recording"}
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
            >
              {cefrLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">
              Interview type
            </span>
            <select
              value={interviewType}
              onChange={(event) => setInterviewType(event.target.value)}
              disabled={busy || recordingStatus === "recording"}
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="mixed HR + behavioral + role-specific">
                Mixed HR + behavioral + role-specific
              </option>
              <option value="behavioral STAR interview">
                Behavioral STAR interview
              </option>
              <option value="technical role interview">
                Technical role interview
              </option>
              <option value="German culture-fit interview">
                German culture-fit interview
              </option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-neutral-700">
              Questions
            </span>
            <select
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
              disabled={busy || recordingStatus === "recording"}
              className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
            >
              {[3, 5, 8, 10, 12].map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["listen", "read"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  speechPlayback.stop();
                  setQuestionMode(mode);
                }}
                disabled={recordingStatus === "recording"}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-semibold capitalize",
                  questionMode === mode
                    ? "border-teal-700 bg-teal-50 text-teal-950"
                    : "border-neutral-300 bg-white hover:bg-neutral-50",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={generateInterviewKit}
            disabled={busy || recordingStatus === "recording"}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingKit ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate interview
          </button>
        </div>
      </section>

      {analysis ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                {analysis.roleTitle} {kitSource ? `· ${kitSource}` : ""}
              </p>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-700">
                {analysis.candidateSummary}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <InfoList title="Match strengths" items={analysis.matchStrengths} />
            <InfoList title="Gap warnings" items={analysis.resumeGaps} />
            <InfoList title="Answer strategy" items={analysis.answerStrategy} />
          </div>
        </section>
      ) : null}

      {questionSet && activeQuestion ? (
        <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-5">
            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Question navigator
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {answeredCount} of {questions.length} complete
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                  {Math.round((answeredCount / questions.length) * 100)}%
                </span>
              </div>
              <div className="mt-4 grid gap-2">
                {questions.map((question, index) => {
                  const answered = Boolean(answers[question.id]);
                  const active = index === activeIndex;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => moveToQuestion(index)}
                      disabled={
                        recordingStatus === "recording" ||
                        recordingStatus === "processing"
                      }
                      className={cn(
                        "flex items-start gap-3 rounded-md border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                        active
                          ? "border-teal-700 bg-teal-50"
                          : "border-neutral-200 bg-white hover:bg-neutral-50",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-semibold",
                          answered
                            ? "bg-teal-700 text-white"
                            : active
                              ? "bg-white text-teal-800"
                              : "bg-neutral-100 text-neutral-600",
                        )}
                      >
                        {answered ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          {categoryLabels[question.category]} · {question.difficulty}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-sm font-medium leading-5 text-neutral-900">
                          {question.questionGerman}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-sm font-semibold">Interview progress</p>
              <button
                type="button"
                onClick={generateFinalReport}
                disabled={
                  loadingReport ||
                  answeredCount === 0 ||
                  recordingStatus === "recording" ||
                  recordingStatus === "processing"
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-3 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Complete interview
              </button>
              <p className="mt-2 text-xs leading-5 text-neutral-500">
                You can complete after one answer, or finish the full question set for
                a stronger report.
              </p>
            </section>
          </aside>

          <main className="space-y-5">
            <section className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Question {activeIndex + 1} of {questions.length} ·{" "}
                    {categoryLabels[activeQuestion.category]}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-9">
                    {activeQuestion.questionGerman}
                  </h2>
                  {questionMode === "read" ? (
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {activeQuestion.questionEnglish}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {recordingStatus !== "recording" ? (
                    <SpeechPlaybackControls
                      controller={speechPlayback}
                      id={`interview-question-${activeQuestion.id}`}
                      text={activeQuestion.questionGerman}
                      playLabel="Listen"
                    />
                  ) : (
                    <span className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                      Question audio off
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={resetAnswer}
                    disabled={
                      recordingStatus === "recording" ||
                      recordingStatus === "processing"
                    }
                    className="rounded-md border border-neutral-300 p-2 hover:bg-neutral-50 disabled:opacity-50"
                    aria-label="Reset current answer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <PromptInfo
                  label="Framework"
                  value={activeQuestion.answerFramework}
                />
                <PromptInfo
                  label="Vocabulary"
                  value={activeQuestion.vocabularyTargets.join(", ")}
                />
                <PromptInfo
                  label="Difficulty"
                  value={activeQuestion.difficulty}
                />
              </div>

              <div
                className={cn(
                  "mt-5 rounded-xl border p-6 text-center",
                  recordingStatus === "recording"
                    ? "border-rose-200 bg-rose-50"
                    : recordingStatus === "processing"
                      ? "border-amber-200 bg-amber-50"
                      : "border-teal-200 bg-teal-50",
                )}
              >
                <span
                  className={cn(
                    "mx-auto grid h-16 w-16 place-items-center rounded-full",
                    recordingStatus === "recording"
                      ? "animate-pulse bg-rose-700 text-white"
                      : "bg-teal-700 text-white",
                  )}
                >
                  {recordingStatus === "processing" ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : recordingStatus === "recording" ? (
                    <Square className="h-6 w-6" />
                  ) : (
                    <Mic className="h-7 w-7" />
                  )}
                </span>
                <h3 className="mt-4 text-lg font-semibold">
                  {recordingStatus === "recording"
                    ? `Recording ${formatDuration(recordingSeconds)}`
                    : recordingStatus === "processing"
                      ? "Analyzing your audio"
                      : "Answer without interruption"}
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-600">
                  {recordingStatus === "recording"
                    ? "Take pauses when you need them. Nothing is submitted until you click Stop and analyze."
                    : recordingStatus === "processing"
                      ? "AI is transcribing the answer and listening for pronunciation, pacing, pauses, clarity, and confidence."
                      : "The AI stays silent while you speak. Start when ready, then end the answer yourself."}
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {recordingStatus === "recording" ? (
                    <button
                      type="button"
                      onClick={stopAndAnalyzeRecording}
                      className="flex items-center gap-2 rounded-md bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
                    >
                      <Square className="h-4 w-4" />
                      Stop and analyze
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={recordingStatus !== "idle"}
                      className="flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {recordingStatus === "requesting" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      Start answer
                    </button>
                  )}
                  <label
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold",
                      recordingStatus === "idle"
                        ? "cursor-pointer hover:bg-neutral-50"
                        : "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    Upload answer audio
                    <input
                      type="file"
                      accept="audio/*,.webm,.mp3,.m4a,.wav"
                      disabled={recordingStatus !== "idle"}
                      className="sr-only"
                      onChange={(event) => {
                        void handleAudioUpload(event.target.files?.[0] || null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {recordingUrl ? (
                <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-sm font-semibold">Recorded answer</p>
                  <audio
                    src={recordingUrl}
                    controls
                    controlsList="nodownload"
                    className="mt-3 w-full"
                  />
                </div>
              ) : null}

              {transcript ? (
                <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">German transcript</p>
                    {analysisBasis ? (
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
                          analysisBasis === "audio"
                            ? "border-teal-200 bg-teal-50 text-teal-800"
                            : "border-amber-200 bg-amber-50 text-amber-800",
                        )}
                      >
                        {analysisBasis === "audio"
                          ? "Audio-aware"
                          : "Transcript fallback"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-800">
                    {transcript}
                  </p>
                  {audioWarning ? (
                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                      Audio analysis fallback: {audioWarning}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={() => moveToQuestion(Math.max(0, activeIndex - 1))}
                  disabled={
                    activeIndex === 0 ||
                    recordingStatus === "recording" ||
                    recordingStatus === "processing"
                  }
                  className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    moveToQuestion(
                      Math.min(questions.length - 1, activeIndex + 1),
                    )
                  }
                  disabled={
                    !activeAnswer ||
                    activeIndex >= questions.length - 1 ||
                    recordingStatus === "recording" ||
                    recordingStatus === "processing"
                  }
                  className="flex items-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  Next answered question
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            {activeAnswer ? <AnswerFeedbackCard answer={activeAnswer} /> : null}
          </main>
        </div>
      ) : (
        <section className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center">
          <BriefcaseBusiness className="mx-auto h-9 w-9 text-teal-700" />
          <h2 className="mt-4 text-xl font-semibold">
            Build a focused interview workspace
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Generate the interview to get a compact question navigator and one
            distraction-free answer workspace.
          </p>
        </section>
      )}

      {analysis ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <FileAudio className="h-5 w-5 text-teal-700" />
              <p className="text-sm font-semibold">Role vocabulary</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {analysis.germanVocabularyPack.map((item) => (
                <div
                  key={item.german}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                >
                  <p className="font-semibold">{item.german}</p>
                  <p className="mt-1 text-sm text-neutral-600">{item.english}</p>
                  <p className="mt-2 text-sm leading-5 text-neutral-800">
                    {item.usage}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <p className="text-sm font-semibold">Pressure tips</p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-neutral-700">
              {(questionSet?.pressureTips || []).map((tip) => (
                <li key={tip} className="flex gap-2">
                  <Circle className="mt-2 h-2 w-2 flex-none fill-teal-700 text-teal-700" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {finalReport ? (
        <FinalReportCard report={finalReport} source={finalReportSource} />
      ) : null}
    </div>
  );
}

function AnswerFeedbackCard({ answer }: { answer: StoredAnswer }) {
  const feedback = answer.feedback;

  return (
    <section className="rounded-lg border border-teal-200 bg-teal-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
            Answer feedback
          </p>
          <h2 className="mt-1 text-xl font-semibold text-teal-950">
            Communication, language, and role fit
          </h2>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-900">
            {answer.source}
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-900">
            {answer.analysisBasis === "audio" ? "Audio-aware" : "Transcript"}
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-teal-950">
        {feedback.englishFeedback}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ScoreMini label="Grammar" score={feedback.language.grammarScore} />
        <ScoreMini label="Fluency" score={feedback.language.fluencyScore} />
        <ScoreMini label="Role fit" score={feedback.interview.roleFitScore} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <TextPanel
          title="Corrected German"
          value={feedback.correctedGermanAnswer}
        />
        <TextPanel
          title="Stronger model answer"
          value={feedback.conciseModelAnswerGerman}
        />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <InfoList
          title="Pronunciation and delivery"
          items={feedback.language.pronunciationNotes}
        />
        <InfoList
          title="Strong signals"
          items={feedback.interview.strongSignals}
        />
        <InfoList
          title="Signals to add"
          items={feedback.interview.missedSignals}
        />
      </div>
    </section>
  );
}

function FinalReportCard({
  report,
  source,
}: {
  report: InterviewFinalReport;
  source: Source | null;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Final interview report · {source}
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            {report.overallReadinessScore}% readiness
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-700">
            {report.executiveSummary}
          </p>
        </div>
        <span className="rounded-full border border-neutral-200 px-3 py-1 text-sm font-semibold">
          {report.estimatedSpeakingLevel}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <ScoreMini label="Grammar" score={report.languageScores.grammar} />
        <ScoreMini label="Vocabulary" score={report.languageScores.vocabulary} />
        <ScoreMini label="Fluency" score={report.languageScores.fluency} />
        <ScoreMini label="Pronunciation" score={report.languageScores.pronunciation} />
        <ScoreMini label="Role fit" score={report.interviewScores.roleFit} />
        <ScoreMini
          label="Structure"
          score={report.interviewScores.answerStructure}
        />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <InfoList title="Strongest answers" items={report.strongestAnswers} />
        <InfoList title="Improve next" items={report.recurringLanguageIssues} />
        <InfoList title="7-day plan" items={report.sevenDayTrainingPlan} />
      </div>
    </section>
  );
}

function PromptInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-5 text-neutral-800">{value}</p>
    </div>
  );
}

function TextPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-900">{value}</p>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">No major issue identified.</p>
      )}
    </div>
  );
}

function ScoreMini({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-neutral-500">{label}</p>
        <p className="text-sm font-semibold">{score}</p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-neutral-200">
        <div
          className="h-1.5 rounded-full bg-teal-700"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function preferredRecordingMimeType() {
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remaining}`;
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

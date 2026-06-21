"use client";

import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  FileAudio,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Upload,
  Volume2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { cefrLevels, type CefrLevel } from "@/lib/curriculum";
import type {
  InterviewAnswerFeedback,
  InterviewFinalReport,
  InterviewProfileAnalysis,
  InterviewQuestion,
  InterviewQuestionSet,
} from "@/lib/ai/interview-schemas";
import { cn } from "@/lib/utils";

type Source = "openai" | "demo";

type ApiResult<T> = {
  data: T;
  source: Source;
};

type InterviewMode = "listen" | "read";

type StoredAnswer = {
  question: InterviewQuestion;
  transcript: string;
  feedback: InterviewAnswerFeedback;
  source: Source;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
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
  const [transcript, setTranscript] = useState("");
  const [answers, setAnswers] = useState<Record<string, StoredAnswer>>({});
  const [finalReport, setFinalReport] = useState<InterviewFinalReport | null>(null);
  const [finalReportSource, setFinalReportSource] = useState<Source | null>(null);
  const [kitSource, setKitSource] = useState<Source | null>(null);
  const [loadingKit, setLoadingKit] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const questions = useMemo(() => questionSet?.questions || [], [questionSet?.questions]);
  const activeQuestion = questions[activeIndex] || null;
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] : null;
  const answeredCount = Object.keys(answers).length;

  const groupedQuestions = useMemo(() => {
    return questions.reduce<Record<string, InterviewQuestion[]>>((groups, question) => {
      groups[question.category] = [...(groups[question.category] || []), question];
      return groups;
    }, {});
  }, [questions]);

  const shouldHideQuestion =
    questionMode === "listen" && !activeAnswer && transcript.trim().length === 0;

  async function generateInterviewKit() {
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
        throw new Error(readErrorMessage(questionsData, "Question generation failed."));
      }

      setQuestionSet(questionsData.data);
      setKitSource(questionsData.source);
      setActiveIndex(0);
      speakGerman(questionsData.data.questions[0]?.questionGerman || "");
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

  async function scoreAnswer() {
    if (!analysis || !activeQuestion || !transcript.trim()) {
      setError("Capture or paste the spoken answer transcript before scoring.");
      return;
    }

    setLoadingFeedback(true);
    setError("");

    try {
      const response = await fetch("/api/ai/interview/answer-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          resume,
          targetLevel,
          interviewType,
          questionCount,
          analysis,
          question: activeQuestion,
          transcript,
        }),
      });
      const data = (await response.json()) as
        | ApiResult<InterviewAnswerFeedback>
        | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Answer scoring failed."));
      }

      setAnswers((current) => ({
        ...current,
        [activeQuestion.id]: {
          question: activeQuestion,
          transcript,
          feedback: data.data,
          source: data.source,
        },
      }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Answer scoring failed.",
      );
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function generateFinalReport() {
    if (!analysis || !questionSet) {
      setError("Generate an interview kit before creating a report.");
      return;
    }

    const answerList = Object.values(answers);

    if (answerList.length === 0) {
      setError("Answer at least one question before generating the final report.");
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
        caughtError instanceof Error ? caughtError.message : "Final report failed.",
      );
    } finally {
      setLoadingReport(false);
    }
  }

  async function persistSession(report: InterviewFinalReport) {
    if (!analysis || !questionSet) {
      return;
    }

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

  function moveToQuestion(index: number) {
    setActiveIndex(index);
    const nextQuestion = questions[index];
    const stored = nextQuestion ? answers[nextQuestion.id] : null;
    setTranscript(stored?.transcript || "");

    if (nextQuestion && questionMode === "listen") {
      speakGerman(nextQuestion.questionGerman);
    }
  }

  function nextQuestion() {
    if (activeIndex < questions.length - 1) {
      moveToQuestion(activeIndex + 1);
    }
  }

  function toggleDictation() {
    if (dictating) {
      recognitionRef.current?.stop();
      setDictating(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!Recognition) {
      setError("Browser dictation is not available. Upload audio or paste transcript recovery.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript || "";
      setTranscript((current) => [current, spoken].filter(Boolean).join(" "));
    };
    recognition.onerror = () => {
      setError("Dictation failed. Upload audio or paste transcript recovery.");
      setDictating(false);
    };
    recognition.onend = () => setDictating(false);
    recognitionRef.current = recognition;
    setDictating(true);
    recognition.start();
  }

  async function transcribeAudio(file: File | null) {
    if (!file || !activeQuestion) {
      return;
    }

    setLoadingFeedback(true);
    setError("");

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("questionGerman", activeQuestion.questionGerman);

    try {
      const response = await fetch("/api/ai/interview/transcribe-answer", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { transcript?: string; error?: string };

      if (!response.ok || !data.transcript) {
        throw new Error(data.error || "Audio transcription failed.");
      }

      setTranscript(data.transcript);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Audio transcription failed.",
      );
    } finally {
      setLoadingFeedback(false);
    }
  }

  function speakGerman(text: string) {
    if (!text || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr_420px]">
      <aside className="space-y-5">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-700 text-white">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                Interview mode
              </p>
              <h1 className="text-2xl font-semibold tracking-normal">
                German job interview
              </h1>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Target level</span>
              <select
                value={targetLevel}
                onChange={(event) => setTargetLevel(event.target.value as CefrLevel)}
                className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                {cefrLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Interview type</span>
              <select
                value={interviewType}
                onChange={(event) => setInterviewType(event.target.value)}
                className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                <option value="mixed HR + behavioral + role-specific">
                  Mixed HR + behavioral + role-specific
                </option>
                <option value="behavioral STAR interview">Behavioral STAR interview</option>
                <option value="technical role interview">Technical role interview</option>
                <option value="German culture-fit interview">German culture-fit interview</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Questions</span>
              <input
                type="number"
                min={3}
                max={12}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQuestionMode("listen")}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-semibold",
                  questionMode === "listen"
                    ? "border-teal-700 bg-teal-50 text-teal-950"
                    : "border-neutral-300 hover:bg-neutral-50",
                )}
              >
                Listen mode
              </button>
              <button
                type="button"
                onClick={() => setQuestionMode("read")}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-semibold",
                  questionMode === "read"
                    ? "border-teal-700 bg-teal-50 text-teal-950"
                    : "border-neutral-300 hover:bg-neutral-50",
                )}
              >
                Read mode
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-700">Job description</p>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="mt-3 min-h-44 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
          />
          <p className="mt-4 text-sm font-semibold text-neutral-700">Resume</p>
          <textarea
            value={resume}
            onChange={(event) => setResume(event.target.value)}
            className="mt-3 min-h-44 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
          />
          <button
            type="button"
            onClick={generateInterviewKit}
            disabled={loadingKit}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingKit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate interview kit
          </button>
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Interview room {kitSource ? `(${kitSource})` : ""}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                {questionSet?.title || "Generate a role-specific German interview"}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
                {analysis?.candidateSummary ||
                  "Paste a job description and resume to create German interview questions, role vocabulary, and spoken-answer scoring."}
              </p>
            </div>
            <div className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold">
              {answeredCount}/{questions.length || questionCount} answered
            </div>
          </div>

          {analysis ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <InfoList title="Match strengths" items={analysis.matchStrengths} />
              <InfoList title="Gap warnings" items={analysis.resumeGaps} />
              <InfoList title="Answer strategy" items={analysis.answerStrategy} />
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Question bank
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                Likely interview questions
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {questions.length ? (
              Object.entries(groupedQuestions).map(([category, grouped]) => (
                <div key={category}>
                  <p className="mb-2 text-sm font-semibold text-neutral-700">
                    {categoryLabels[category as InterviewQuestion["category"]]}
                  </p>
                  <div className="grid gap-2">
                    {grouped.map((question) => {
                      const questionIndex = questions.findIndex((item) => item.id === question.id);
                      const answered = Boolean(answers[question.id]);

                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => moveToQuestion(questionIndex)}
                          className={cn(
                            "rounded-md border px-3 py-3 text-left text-sm hover:bg-neutral-50",
                            questionIndex === activeIndex
                              ? "border-teal-700 bg-teal-50"
                              : "border-neutral-200",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{question.questionGerman}</span>
                            {answered ? (
                              <CheckCircle2 className="h-4 w-4 text-teal-700" />
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-neutral-500">
                            {question.difficulty} · {question.answerFramework}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-sm leading-6 text-neutral-600">
                Questions will appear here after AI analyzes the job description and resume.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Active question
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                {activeQuestion ? `Question ${activeIndex + 1}` : "No question selected"}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => activeQuestion && speakGerman(activeQuestion.questionGerman)}
                disabled={!activeQuestion}
                className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Volume2 className="h-4 w-4" />
                Listen
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranscript("");
                  if (activeQuestion) {
                    setAnswers((current) => {
                      const next = { ...current };
                      delete next[activeQuestion.id];
                      return next;
                    });
                  }
                }}
                disabled={!activeQuestion}
                className="rounded-md border border-neutral-300 p-2 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Reset answer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {activeQuestion ? (
            <>
              <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                {shouldHideQuestion ? (
                  <div className="flex items-center gap-3 text-sm text-neutral-700">
                    <Play className="h-4 w-4 text-teal-700" />
                    Listen mode is active. Play the question and answer before revealing text.
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-semibold leading-7">
                      {activeQuestion.questionGerman}
                    </p>
                    <p className="mt-2 text-sm text-neutral-600">
                      {activeQuestion.questionEnglish}
                    </p>
                  </>
                )}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  className="min-h-44 resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
                  placeholder="Spoken answer transcript appears here..."
                />
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={toggleDictation}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-neutral-50",
                      dictating
                        ? "border-rose-300 bg-rose-50 text-rose-900"
                        : "border-neutral-300",
                    )}
                  >
                    {dictating ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {dictating ? "Stop dictation" : "Speak answer"}
                  </button>
                  <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50">
                    <Upload className="h-4 w-4" />
                    Upload audio
                    <input
                      type="file"
                      accept="audio/*,.webm,.mp3,.m4a,.wav"
                      className="sr-only"
                      onChange={(event) => transcribeAudio(event.target.files?.[0] || null)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={scoreAnswer}
                    disabled={loadingFeedback || !transcript.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingFeedback ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Score answer
                  </button>
                  <button
                    type="button"
                    onClick={nextQuestion}
                    disabled={!activeAnswer || activeIndex >= questions.length - 1}
                    className="w-full rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next question
                  </button>
                </div>
              </div>

              {activeAnswer ? (
                <AnswerFeedbackCard answer={activeAnswer} />
              ) : null}
            </>
          ) : (
            <p className="mt-4 text-sm text-neutral-600">Generate a question set first.</p>
          )}
        </section>
      </main>

      <aside className="space-y-5">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-teal-700" />
            <p className="text-sm font-semibold">Role vocabulary</p>
          </div>
          <div className="mt-4 space-y-3">
            {analysis?.germanVocabularyPack.length ? (
              analysis.germanVocabularyPack.map((item) => (
                <div key={item.german} className="rounded-lg border border-neutral-200 p-3">
                  <p className="font-semibold">{item.german}</p>
                  <p className="mt-1 text-sm text-neutral-600">{item.english}</p>
                  <p className="mt-2 text-sm leading-5 text-neutral-800">{item.usage}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-neutral-600">
                AI will extract job-specific German phrases from the resume and job description.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <button
            type="button"
            onClick={generateFinalReport}
            disabled={loadingReport || answeredCount === 0}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Generate final report
          </button>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            Scores are practice feedback for interview preparation, not hiring guarantees.
          </p>
        </section>

        {finalReport ? (
          <section className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                Final report
              </p>
              <span className="rounded-full border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-500">
                {finalReportSource}
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal">
              {finalReport.overallReadinessScore}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {finalReport.executiveSummary}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ScoreMini label="Grammar" score={finalReport.languageScores.grammar} />
              <ScoreMini label="Vocabulary" score={finalReport.languageScores.vocabulary} />
              <ScoreMini label="Fluency" score={finalReport.languageScores.fluency} />
              <ScoreMini label="Role fit" score={finalReport.interviewScores.roleFit} />
              <ScoreMini
                label="Structure"
                score={finalReport.interviewScores.answerStructure}
              />
              <ScoreMini label="Confidence" score={finalReport.interviewScores.confidence} />
            </div>
            <InfoList title="7-day plan" items={finalReport.sevenDayTrainingPlan} compact />
            <InfoList
              title="German phrases"
              items={finalReport.recommendedGermanPhrases}
              compact
            />
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function AnswerFeedbackCard({ answer }: { answer: StoredAnswer }) {
  const feedback = answer.feedback;

  return (
    <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-teal-950">Per-answer feedback</p>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-teal-900">
          {answer.source}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-teal-950">{feedback.englishFeedback}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ScoreMini label="Grammar" score={feedback.language.grammarScore} />
        <ScoreMini label="Vocabulary" score={feedback.language.vocabularyScore} />
        <ScoreMini label="Role fit" score={feedback.interview.roleFitScore} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Corrected German
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-900">
            {feedback.correctedGermanAnswer}
          </p>
        </div>
        <div className="rounded-md bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Model answer
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-900">
            {feedback.conciseModelAnswerGerman}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoList({
  title,
  items,
  compact = false,
}: {
  title: string;
  items: string[];
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-neutral-200 p-4", compact && "mt-4")}>
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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
        <div className="h-1.5 rounded-full bg-teal-700" style={{ width: `${score}%` }} />
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

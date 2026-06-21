"use client";

import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageCirclePlus,
  Mic,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  cefrLevels,
  initialConversationScenarios,
  lessonSeeds,
  type CefrLevel,
  type LessonSeed,
} from "@/lib/curriculum";
import type {
  ConversationReport,
  ConversationTurn,
  GeneratedLesson,
  GeneratedScenario,
  LessonMoreBlock,
} from "@/lib/ai/lesson-schemas";
import { SpeechPlaybackControls } from "@/components/audio/speech-playback-controls";
import { useSpeechPlayback } from "@/hooks/use-speech-playback";
import { cn } from "@/lib/utils";

type Source = "openai" | "demo";

type ApiResult<T> = {
  data: T;
  source: Source;
};

type ChatMessage = {
  id: string;
  role: "ai" | "learner";
  content: string;
  hint?: string;
  correction?: ConversationTurn["correction"];
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

const defaultLesson = lessonSeeds[0];

export function LessonPlayerClient() {
  const [activeSeed, setActiveSeed] = useState<LessonSeed>(defaultLesson);
  const [level, setLevel] = useState<CefrLevel>(defaultLesson.level);
  const [customTopic, setCustomTopic] = useState(defaultLesson.topic);
  const [lesson, setLesson] = useState<GeneratedLesson | null>(null);
  const [lessonSource, setLessonSource] = useState<Source | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [moreRequest, setMoreRequest] = useState(
    "I want more speaking examples and practical drills for daily use",
  );
  const [moreBlocks, setMoreBlocks] = useState<LessonMoreBlock[]>([]);
  const [moreLoading, setMoreLoading] = useState(false);
  const [scenarios, setScenarios] = useState<GeneratedScenario[]>(
    initialConversationScenarios,
  );
  const [activeScenario, setActiveScenario] = useState<GeneratedScenario>(
    initialConversationScenarios[0],
  );
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [newScenarioTopic, setNewScenarioTopic] = useState("train delay");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [turnLoading, setTurnLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<ConversationReport | null>(null);
  const [reportSource, setReportSource] = useState<Source | null>(null);
  const [error, setError] = useState("");
  const [dictating, setDictating] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const speechPlayback = useSpeechPlayback({ rate: 0.9 });

  const lessonForQuiz = lesson?.quickQuiz || [];
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  const weakTags = useMemo(() => {
    const lessonTags = lesson?.weakSpotPrediction || activeSeed.weakTags;
    const reportTags = report?.weakTags || [];
    return Array.from(new Set([...lessonTags, ...reportTags])).slice(0, 6);
  }, [activeSeed.weakTags, lesson?.weakSpotPrediction, report?.weakTags]);

  useEffect(() => {
    void generateLessonForSeed(defaultLesson);
    startScenario(initialConversationScenarios[0]);
    return () => recognitionRef.current?.stop();
    // Initial AI lesson generation should run once when the lesson workspace mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, turnLoading]);

  async function generateLessonForSeed(seed: LessonSeed, topicOverride?: string) {
    setLessonLoading(true);
    setError("");
    setReport(null);
    setQuizAnswers({});
    setMoreBlocks([]);
    setActiveSeed(seed);
    setLevel(seed.level);
    setCustomTopic(topicOverride || seed.topic);

    try {
      const response = await fetch("/api/ai/lesson-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: seed.level,
          topic: topicOverride || seed.topic,
          goal: seed.goal,
          weakTags: seed.weakTags,
        }),
      });
      const data = (await response.json()) as ApiResult<GeneratedLesson> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate lesson."));
      }

      setLesson(data.data);
      setLessonSource(data.source);

      const lessonScenario: GeneratedScenario = {
        id: `lesson-${seed.id}`,
        title: data.data.conversationScenario.title,
        level: data.data.level,
        learnerRole: data.data.conversationScenario.learnerRole,
        aiRole: data.data.conversationScenario.aiRole,
        setting: data.data.conversationScenario.situation,
        openingLine: data.data.conversationScenario.openingLine,
        goals: data.data.conversationScenario.goals,
        vocabulary: data.data.vocabulary.map((item) => ({
          german: item.german,
          english: item.english,
        })),
        assessmentFocus: data.data.weakSpotPrediction,
      };

      setScenarios((current) => mergeScenarios([lessonScenario, ...current]));
      startScenario(lessonScenario);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Lesson generation failed.",
      );
    } finally {
      setLessonLoading(false);
    }
  }

  async function generateCustomLesson() {
    const seed: LessonSeed = {
      id: `custom-${Date.now()}`,
      level,
      title: customTopic || "Custom lesson",
      topic: customTopic || "Custom lesson",
      goal: `Practice ${customTopic || "German"} with AI-generated tutoring and conversation.`,
      weakTags,
    };

    await generateLessonForSeed(seed, customTopic);
  }

  async function generateMoreScenario() {
    setScenarioLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/scenario-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          topic: newScenarioTopic || customTopic || activeSeed.topic,
          existingTitles: scenarios.map((scenario) => scenario.title),
          weakTags,
        }),
      });
      const data = (await response.json()) as ApiResult<GeneratedScenario> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate scenario."));
      }

      setScenarios((current) => mergeScenarios([data.data, ...current]));
      startScenario(data.data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Scenario generation failed.",
      );
    } finally {
      setScenarioLoading(false);
    }
  }

  async function generateMoreLessonContent() {
    if (!lesson) {
      setError("Generate a lesson first, then ask for more.");
      return;
    }

    setMoreLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/lesson-more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          currentLessonTitle: lesson.title,
          currentGoal: lesson.goal,
          userRequest: moreRequest,
          existingWeakTags: weakTags,
        }),
      });
      const data = (await response.json()) as ApiResult<LessonMoreBlock> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate more lesson content."));
      }

      setMoreBlocks((current) => [data.data, ...current]);
      setScenarios((current) =>
        mergeScenarios([
          {
            id: `more-${Date.now()}`,
            title: data.data.title,
            level,
            learnerRole: "German learner",
            aiRole: "German tutor",
            setting: data.data.reason,
            openingLine:
              data.data.conversationPrompts[0] ||
              "Was moechten Sie dazu auf Deutsch sagen?",
            goals: data.data.conversationPrompts,
            vocabulary: data.data.examples.map((example) => ({
              german: example.german,
              english: example.english,
            })),
            assessmentFocus: data.data.weakTags,
          },
          ...current,
        ]),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "More lesson generation failed.",
      );
    } finally {
      setMoreLoading(false);
    }
  }

  function startScenario(scenario: GeneratedScenario) {
    speechPlayback.stop();
    setActiveScenario(scenario);
    setReport(null);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "ai",
        content: scenario.openingLine,
        hint: "Reply in German. Short sentences are fine.",
      },
    ]);
  }

  async function sendConversationTurn() {
    const learnerMessage = reply.trim();

    if (!learnerMessage || turnLoading) {
      return;
    }

    const learnerChatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "learner",
      content: learnerMessage,
    };

    const nextMessages = [...messages, learnerChatMessage];
    setMessages(nextMessages);
    setReply("");
    setTurnLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/conversation-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          scenario: activeScenario,
          history: nextMessages.map(({ role, content }) => ({ role, content })),
          learnerMessage,
        }),
      });
      const data = (await response.json()) as ApiResult<ConversationTurn> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not continue conversation."));
      }

      const aiMessageId = crypto.randomUUID();
      setMessages((current) => [
        ...current,
        {
          id: aiMessageId,
          role: "ai",
          content: data.data.aiGermanReply,
          hint: data.data.englishHint,
          correction: data.data.correction,
        },
      ]);
      speechPlayback.play(
        `lesson-message-${aiMessageId}`,
        data.data.aiGermanReply,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Conversation turn failed.",
      );
    } finally {
      setTurnLoading(false);
    }
  }

  async function endConversationAndReport() {
    if (messages.filter((message) => message.role === "learner").length === 0) {
      setError("Send at least one German reply before ending the call.");
      return;
    }

    setReportLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/conversation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          scenario: activeScenario,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await response.json()) as ApiResult<ConversationReport> | { error?: string };

      if (!response.ok || !("data" in data)) {
        throw new Error(readErrorMessage(data, "Could not generate call report."));
      }

      setReport(data.data);
      setReportSource(data.source);
      await persistReport(data.data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Conversation report failed.",
      );
    } finally {
      setReportLoading(false);
    }
  }

  async function persistReport(result: ConversationReport) {
    await fetch("/api/conversation-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        scenario: activeScenario,
        history: messages.map(({ role, content }) => ({ role, content })),
        report: result,
      }),
    }).catch(() => undefined);
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
      setError("Browser dictation is not available. Type your German reply instead.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setReply((current) => [current, transcript].filter(Boolean).join(" "));
    };
    recognition.onerror = () => {
      setError("Dictation failed. You can still type your reply.");
      setDictating(false);
    };
    recognition.onend = () => setDictating(false);
    recognitionRef.current = recognition;
    setDictating(true);
    recognition.start();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_1fr_380px]">
      <aside className="space-y-5">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            AI lesson builder
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            Interactive lesson player
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
              <span className="text-sm font-semibold text-neutral-700">Lesson topic</span>
              <input
                value={customTopic}
                onChange={(event) => setCustomTopic(event.target.value)}
                className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="doctor appointment, airport, job interview"
              />
            </label>
            <button
              type="button"
              onClick={generateCustomLesson}
              disabled={lessonLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lessonLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate lesson
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <WandSparkles className="h-5 w-5 text-teal-700" />
            <p className="text-sm font-semibold">Ask AI for more</p>
          </div>
          <textarea
            value={moreRequest}
            onChange={(event) => setMoreRequest(event.target.value)}
            className="mt-3 min-h-28 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
            placeholder="More examples for dative, job interview German, Goethe A2 speaking..."
          />
          <button
            type="button"
            onClick={generateMoreLessonContent}
            disabled={moreLoading || !lesson}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {moreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            More related content
          </button>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold text-neutral-700">Starter paths</p>
          <div className="mt-3 space-y-2">
            {lessonSeeds.map((seed) => (
              <button
                key={seed.id}
                type="button"
                onClick={() => generateLessonForSeed(seed)}
                className={cn(
                  "w-full rounded-md border px-3 py-3 text-left text-sm transition hover:bg-neutral-50",
                  seed.id === activeSeed.id
                    ? "border-teal-700 bg-teal-50"
                    : "border-neutral-200 bg-white",
                )}
              >
                <span className="font-semibold">{seed.level}</span>
                <span className="ml-2">{seed.title}</span>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
            {error}
          </div>
        ) : null}

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Generated lesson {lessonSource ? `(${lessonSource})` : ""}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                {lesson?.title || "Generating your German lesson"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {lesson?.goal || "A practical lesson will appear here."}
              </p>
            </div>
            <SpeechPlaybackControls
              controller={speechPlayback}
              id="lesson-warmup"
              text={lesson?.warmupQuestion || ""}
              playLabel="Warmup"
            />
          </div>

          {lessonLoading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              AI is building the lesson, drills, and scenario.
            </div>
          ) : lesson ? (
            <div className="mt-6 grid gap-5">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-700">AI tutorial</p>
                <p className="mt-2 text-sm leading-6 text-neutral-800">{lesson.explanation}</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <LessonList title="Grammar focus" items={lesson.grammarFocus} />
                <LessonList title="Tutorial steps" items={lesson.tutorialSteps} />
              </div>

              <div>
                <p className="text-sm font-semibold text-neutral-700">Vocabulary</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {lesson.vocabulary.map((item) => (
                    <div
                      key={`${item.german}-${item.english}`}
                      className="rounded-lg border border-neutral-200 p-3"
                    >
                      <p className="font-semibold">{item.german}</p>
                      <p className="mt-1 text-sm text-neutral-600">{item.english}</p>
                      <p className="mt-2 text-sm leading-5 text-neutral-800">{item.example}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-neutral-700">Micro drills</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {lesson.microDrills.map((drill) => (
                    <details
                      key={drill.prompt}
                      className="rounded-lg border border-neutral-200 p-4"
                    >
                      <summary className="cursor-pointer text-sm font-semibold">
                        {drill.prompt}
                      </summary>
                      <p className="mt-3 text-sm font-semibold text-teal-800">
                        {drill.answer}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {drill.explanation}
                      </p>
                    </details>
                  ))}
                </div>
              </div>

              {moreBlocks.length ? (
                <div>
                  <p className="text-sm font-semibold text-neutral-700">
                    On-demand expansions
                  </p>
                  <div className="mt-3 space-y-4">
                    {moreBlocks.map((block) => (
                      <div
                        key={`${block.title}-${block.reason}`}
                        className="rounded-lg border border-teal-200 bg-teal-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-teal-950">
                              {block.title}
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-teal-900">
                              {block.reason}
                            </p>
                          </div>
                          <Sparkles className="h-5 w-5 text-teal-700" />
                        </div>
                        <p className="mt-4 text-sm leading-6 text-teal-950">
                          {block.explanation}
                        </p>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          {block.examples.map((example) => (
                            <div key={example.german} className="rounded-md bg-white p-3">
                              <p className="font-semibold">{example.german}</p>
                              <p className="mt-1 text-sm text-neutral-600">
                                {example.english}
                              </p>
                              <p className="mt-2 text-sm leading-5 text-neutral-800">
                                {example.note}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          {block.drills.map((drill) => (
                            <details key={drill.prompt} className="rounded-md bg-white p-3">
                              <summary className="cursor-pointer text-sm font-semibold">
                                {drill.prompt}
                              </summary>
                              <p className="mt-2 text-sm font-semibold text-teal-800">
                                {drill.answer}
                              </p>
                              <p className="mt-1 text-sm leading-5 text-neutral-600">
                                {drill.explanation}
                              </p>
                            </details>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Quick check
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                Lesson quiz
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {lessonForQuiz.length ? (
              lessonForQuiz.map((question, index) => {
                const selected = quizAnswers[index];
                const correct = selected === question.answer;

                return (
                  <div key={question.question} className="rounded-lg border border-neutral-200 p-4">
                    <p className="font-semibold">{question.question}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            setQuizAnswers((current) => ({ ...current, [index]: option }))
                          }
                          className={cn(
                            "rounded-md border px-3 py-2 text-sm font-medium",
                            selected === option
                              ? "border-teal-700 bg-teal-50 text-teal-950"
                              : "border-neutral-200 hover:bg-neutral-50",
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {selected ? (
                      <p
                        className={cn(
                          "mt-3 text-sm leading-6",
                          correct ? "text-teal-800" : "text-rose-800",
                        )}
                      >
                        {correct ? "Correct. " : `Answer: ${question.answer}. `}
                        {question.explanation}
                      </p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-neutral-600">Generate a lesson to unlock quiz checks.</p>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                German AI call
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                {activeScenario.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => startScenario(activeScenario)}
              className="rounded-md border border-neutral-300 p-2 hover:bg-neutral-50"
              aria-label="Restart conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-600">{activeScenario.setting}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeScenario.goals.map((goal) => (
              <span
                key={goal}
                className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900"
              >
                {goal}
              </span>
            ))}
          </div>

          <div className="mt-5 h-[420px] overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-lg border p-3",
                    message.role === "learner"
                      ? "ml-8 border-teal-200 bg-teal-50"
                      : "mr-8 border-neutral-200 bg-white",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {message.role === "learner" ? "You" : activeScenario.aiRole}
                    </p>
                    {message.role === "ai" ? (
                      <SpeechPlaybackControls
                        controller={speechPlayback}
                        id={`lesson-message-${message.id}`}
                        text={message.content}
                        playLabel="Play reply"
                        compact
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6">{message.content}</p>
                  {message.hint ? (
                    <p className="mt-2 text-xs leading-5 text-neutral-500">{message.hint}</p>
                  ) : null}
                  {message.correction ? (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2">
                      <p className="text-xs font-semibold text-amber-950">Correction</p>
                      <p className="mt-1 text-xs leading-5 text-amber-950">
                        {message.correction.correctedGerman}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-900">
                        {message.correction.explanation}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
              {turnLoading ? (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI is replying in German.
                </div>
              ) : null}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  void sendConversationTurn();
                }
              }}
              className="min-h-24 w-full resize-none rounded-lg border border-neutral-300 p-3 text-sm leading-6"
              placeholder="Antworten Sie auf Deutsch..."
            />
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={toggleDictation}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-neutral-50",
                  dictating ? "border-rose-300 bg-rose-50 text-rose-900" : "border-neutral-300",
                )}
              >
                {dictating ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {dictating ? "Stop" : "Dictate"}
              </button>
              <button
                type="button"
                onClick={sendConversationTurn}
                disabled={turnLoading || !reply.trim()}
                className="flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
              <button
                type="button"
                onClick={endConversationAndReport}
                disabled={reportLoading}
                className="flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Results
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <MessageCirclePlus className="h-5 w-5 text-teal-700" />
            <p className="text-sm font-semibold">Ask for more scenarios</p>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={newScenarioTopic}
              onChange={(event) => setNewScenarioTopic(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="visa office, doctor, airport"
            />
            <button
              type="button"
              onClick={generateMoreScenario}
              disabled={scenarioLoading}
              className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scenarioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {scenarios.slice(0, 6).map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => startScenario(scenario)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-neutral-50",
                  scenario.id === activeScenario.id
                    ? "border-teal-700 bg-teal-50"
                    : "border-neutral-200",
                )}
              >
                <span>
                  <span className="font-semibold">{scenario.title}</span>
                  <span className="ml-2 text-xs text-neutral-500">{scenario.level}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              </button>
            ))}
          </div>
        </section>

        {report ? (
          <section className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                Call results
              </p>
              <span className="rounded-full border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-500">
                {reportSource}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">
              {report.cefrEstimate} estimate
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{report.summary}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ReportScore label="Fluency" score={report.fluencyScore} />
              <ReportScore label="Grammar" score={report.grammarScore} />
              <ReportScore label="Vocabulary" score={report.vocabularyScore} />
              <ReportScore label="Task" score={report.taskCompletionScore} />
            </div>
            <LessonList title="Training plan" items={report.trainingPlan} compact />
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function LessonList({
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

function ReportScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-500">{label}</p>
        <p className="text-sm font-semibold">{score}</p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-neutral-200">
        <div className="h-1.5 rounded-full bg-teal-700" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function mergeScenarios(scenarios: GeneratedScenario[]) {
  const seen = new Set<string>();

  return scenarios.filter((scenario) => {
    const key = scenario.title.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
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

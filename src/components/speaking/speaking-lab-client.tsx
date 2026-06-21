"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  Loader2,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  cefrLevels,
  speakingModes,
  speakingTasks,
  type CefrLevel,
  type SpeakingMode,
  type SpeakingTask,
} from "@/lib/curriculum";
import type { SpeechFeedback } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

type LiveStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speech"
  | "processing"
  | "feedback"
  | "error";

type RealtimeSession = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  stream: MediaStream;
  audioElement: HTMLAudioElement;
};

type FeedbackResponse = {
  transcript?: string;
  feedback: SpeechFeedback;
  source: "openai" | "demo";
};

type Attempt = {
  id: string;
  taskTitle: string;
  transcript: string;
  score: number;
  cefr: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const maxAudioUploadBytes = 8 * 1024 * 1024;
const allowedAudioExtensions = [".webm", ".mp3", ".m4a", ".wav", ".ogg", ".mp4"];

const statusCopy: Record<LiveStatus, string> = {
  idle: "Ready",
  connecting: "Connecting",
  listening: "Listening",
  speech: "Speech detected",
  processing: "Analyzing",
  feedback: "Feedback ready",
  error: "Needs attention",
};

export function SpeakingLabClient() {
  const [selectedMode, setSelectedMode] = useState<SpeakingMode>("pronunciation");
  const [selectedLevel, setSelectedLevel] = useState<CefrLevel>("A1");
  const [selectedTaskId, setSelectedTaskId] = useState("a1-intro");
  const [status, setStatus] = useState<LiveStatus>("idle");
  const [transcript, setTranscriptState] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [feedback, setFeedback] = useState<SpeechFeedback | null>(null);
  const [feedbackSource, setFeedbackSource] = useState<"openai" | "demo" | null>(null);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [liveSessionActive, setLiveSessionActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const sessionRef = useRef<RealtimeSession | null>(null);
  const transcriptRef = useRef("");
  const liveTranscriptRef = useRef("");
  const intentionalCloseRef = useRef(false);

  const visibleTasks = useMemo(() => {
    const exact = speakingTasks.filter(
      (task) => task.mode === selectedMode && task.level === selectedLevel,
    );

    if (exact.length > 0) {
      return exact;
    }

    return speakingTasks.filter((task) => task.mode === selectedMode);
  }, [selectedLevel, selectedMode]);

  const activeTask: SpeakingTask =
    visibleTasks.find((task) => task.id === selectedTaskId) ||
    visibleTasks[0] ||
    speakingTasks[0];

  useEffect(() => {
    return () => {
      closeRealtimeSession();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function setTranscript(value: string) {
    transcriptRef.current = value;
    setTranscriptState(value);
  }

  function setLiveTranscriptValue(value: string) {
    liveTranscriptRef.current = value;
    setLiveTranscript(value);
  }

  function addTranscriptTurn(turn: string) {
    const cleanTurn = turn.trim();

    if (!cleanTurn) {
      return;
    }

    setTranscript([transcriptRef.current, cleanTurn].filter(Boolean).join(" "));
  }

  async function startLiveSession() {
    closeRealtimeSession();
    window.speechSynthesis?.cancel();
    setError("");
    setFeedback(null);
    setFeedbackSource(null);
    setTranscript("");
    setLiveTranscriptValue("");
    setManualTranscript("");
    setSaveStatus("idle");
    setSaveMessage("");
    setStatus("connecting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not expose microphone access.");
      setStatus("error");
      return;
    }

    try {
      const tokenResponse = await fetch("/api/ai/realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          level: selectedLevel,
          taskTitle: activeTask.title,
          taskPrompt: activeTask.prompt,
        }),
      });

      const tokenData = (await tokenResponse.json()) as {
        clientSecret?: string;
        error?: string;
      };

      if (!tokenResponse.ok || !tokenData.clientSecret) {
        throw new Error(tokenData.error || "Could not create a realtime session.");
      }

      const pc = new RTCPeerConnection();
      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;

      pc.ontrack = (event) => {
        audioElement.srcObject = event.streams[0];
        void audioElement.play().catch(() => undefined);
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");
      dc.addEventListener("message", handleRealtimeMessage);
      dc.addEventListener("error", () => {
        if (!intentionalCloseRef.current) {
          setError("The live voice connection was interrupted. Use audio upload or transcript fallback.");
          setStatus("error");
        }
        closeRealtimeSession();
      });
      dc.addEventListener("open", () => {
        setStatus("listening");
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Task context: ${activeTask.title}. ${activeTask.prompt}`,
                },
              ],
            },
          }),
        );
      });

      sessionRef.current = { pc, dc, stream, audioElement };
      setLiveSessionActive(true);
      pc.addEventListener("connectionstatechange", () => {
        if (
          sessionRef.current?.pc === pc &&
          (pc.connectionState === "failed" ||
            pc.connectionState === "disconnected")
        ) {
          if (!intentionalCloseRef.current) {
            setError(
              "The live microphone session disconnected. Your captured transcript is still available for analysis.",
            );
            setStatus("error");
          }
          closeRealtimeSession();
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${tokenData.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text());
      }

      await pc.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });
    } catch (caughtError) {
      closeRealtimeSession();
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Live voice session failed.",
      );
      setStatus("error");
    }
  }

  async function stopAndAnalyze() {
    const combinedTranscript = [transcriptRef.current, liveTranscriptRef.current]
      .filter(Boolean)
      .join(" ")
      .trim();

    closeRealtimeSession();
    setLiveTranscriptValue("");

    await analyzeTranscript(combinedTranscript);
  }

  async function analyzeTranscript(rawTranscript: string) {
    const cleanTranscript = rawTranscript.trim();

    if (!cleanTranscript) {
      setError("Speak, upload audio, or paste a transcript before analysis.");
      setStatus("error");
      return;
    }

    setError("");
    setStatus("processing");
    setTranscript(cleanTranscript);

    try {
      const response = await fetch("/api/ai/speech-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: cleanTranscript,
          mode: selectedMode,
          level: selectedLevel,
          taskTitle: activeTask.title,
          taskPrompt: activeTask.prompt,
          target: activeTask.target,
        }),
      });

      const data = (await response.json()) as FeedbackResponse | { error?: string };

      if (!response.ok || !("feedback" in data)) {
        throw new Error(readErrorMessage(data, "Feedback generation failed."));
      }

      setFeedback(data.feedback);
      setFeedbackSource(data.source);
      setStatus("feedback");
      registerAttempt(cleanTranscript, data.feedback);
      await persistAttempt(cleanTranscript, data.feedback);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Feedback generation failed.",
      );
      setStatus("error");
    }
  }

  async function handleAudioUpload(file: File | null) {
    if (!file) {
      return;
    }

    const extension = file.name.includes(".")
      ? `.${file.name.split(".").pop()?.toLowerCase()}`
      : "";

    if (file.size > maxAudioUploadBytes) {
      setError("Audio uploads must be 8 MB or smaller.");
      setStatus("error");
      return;
    }

    if (
      !file.type.startsWith("audio/") &&
      !allowedAudioExtensions.includes(extension)
    ) {
      setError("Upload a WebM, MP3, M4A, WAV, OGG, or MP4 audio file.");
      setStatus("error");
      return;
    }

    closeRealtimeSession();
    setError("");
    setFeedback(null);
    setSaveStatus("idle");
    setSaveMessage("");
    setStatus("processing");

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("mode", selectedMode);
    formData.append("level", selectedLevel);
    formData.append("taskTitle", activeTask.title);
    formData.append("taskPrompt", activeTask.prompt);
    formData.append("target", activeTask.target || "");

    try {
      const response = await fetch("/api/ai/transcribe-upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as FeedbackResponse | { error?: string };

      if (!response.ok || !("feedback" in data)) {
        throw new Error(readErrorMessage(data, "Audio upload analysis failed."));
      }

      const uploadedTranscript = data.transcript || "";
      setTranscript(uploadedTranscript);
      setManualTranscript(uploadedTranscript);
      setFeedback(data.feedback);
      setFeedbackSource(data.source);
      setStatus("feedback");
      registerAttempt(uploadedTranscript, data.feedback);
      await persistAttempt(uploadedTranscript, data.feedback);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Audio upload analysis failed.",
      );
      setStatus("error");
    }
  }

  function handleRealtimeMessage(message: MessageEvent<string>) {
    try {
      const event = JSON.parse(message.data) as Record<string, unknown>;
      const type = typeof event.type === "string" ? event.type : "";

      if (type === "input_audio_buffer.speech_started") {
        setStatus("speech");
      }

      if (type === "input_audio_buffer.speech_stopped") {
        setStatus("listening");
      }

      if (type === "conversation.item.input_audio_transcription.delta") {
        const delta = typeof event.delta === "string" ? event.delta : "";
        setLiveTranscriptValue(`${liveTranscriptRef.current}${delta}`);
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        const completed =
          typeof event.transcript === "string"
            ? event.transcript
            : liveTranscriptRef.current;
        addTranscriptTurn(completed);
        setLiveTranscriptValue("");
      }
    } catch {
      // Realtime emits many events; unknown payloads are safely ignored.
    }
  }

  function closeRealtimeSession() {
    const session = sessionRef.current;

    if (!session) {
      setLiveSessionActive(false);
      return;
    }

    intentionalCloseRef.current = true;
    sessionRef.current = null;
    setLiveSessionActive(false);
    session.stream.getTracks().forEach((track) => track.stop());
    if (session.dc.readyState !== "closed") {
      session.dc.close();
    }
    if (session.pc.connectionState !== "closed") {
      session.pc.close();
    }
    session.audioElement.srcObject = null;
    queueMicrotask(() => {
      intentionalCloseRef.current = false;
    });
  }

  function playModelSentence() {
    const sentence = feedback?.retryPrompt || activeTask.target || activeTask.prompt;

    if (!("speechSynthesis" in window)) {
      setError("Text-to-speech is not available in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "de-DE";
    utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
  }

  function registerAttempt(rawTranscript: string, result: SpeechFeedback) {
    setAttempts((current) => [
      {
        id: crypto.randomUUID(),
        taskTitle: activeTask.title,
        transcript: rawTranscript,
        score: result.fluencyScore,
        cefr: result.cefrLevel,
      },
      ...current,
    ]);
  }

  async function persistAttempt(rawTranscript: string, result: SpeechFeedback) {
    setSaveStatus("saving");
    setSaveMessage("Saving transcript, scores, and weak tags...");

    try {
      const response = await fetch("/api/speaking-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          level: selectedLevel,
          taskTitle: activeTask.title,
          taskPrompt: activeTask.prompt,
          transcript: rawTranscript,
          feedback: result,
        }),
      });
      const data = (await response.json()) as {
        stored?: boolean;
        reason?: string;
      };

      if (!response.ok || !data.stored) {
        throw new Error(data.reason || "Speaking attempt could not be saved.");
      }

      setSaveStatus("saved");
      setSaveMessage("Attempt, skill scores, and weak tags are saved.");
    } catch (caughtError) {
      setSaveStatus("error");
      setSaveMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Speaking attempt could not be saved.",
      );
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                AI Speaking Lab
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">
                Hear, correct, repeat
              </h1>
            </div>
            <div className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold">
              {statusCopy[status]}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {speakingModes.map((mode) => {
              const Icon = mode.icon;
              const active = mode.id === selectedMode;

              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setSelectedMode(mode.id);
                    const nextTasks = speakingTasks.filter(
                      (task) =>
                        task.mode === mode.id && task.level === selectedLevel,
                    );
                    const fallbackTasks = speakingTasks.filter(
                      (task) => task.mode === mode.id,
                    );
                    setSelectedTaskId(
                      nextTasks[0]?.id || fallbackTasks[0]?.id || speakingTasks[0].id,
                    );
                    setFeedback(null);
                    setError("");
                  }}
                  disabled={
                    liveSessionActive ||
                    status === "connecting" ||
                    status === "processing"
                  }
                  className={cn(
                    "min-h-24 rounded-lg border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "border-teal-700 bg-teal-50 text-teal-950"
                      : "border-neutral-200 bg-white hover:bg-neutral-50",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-3 block text-sm font-semibold leading-5">
                    {mode.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">CEFR level</span>
                <select
                  value={selectedLevel}
                  onChange={(event) => {
                    const nextLevel = event.target.value as CefrLevel;
                    setSelectedLevel(nextLevel);
                    const nextTasks = speakingTasks.filter(
                      (task) =>
                        task.mode === selectedMode && task.level === nextLevel,
                    );
                    const fallbackTasks = speakingTasks.filter(
                      (task) => task.mode === selectedMode,
                    );
                    setSelectedTaskId(
                      nextTasks[0]?.id || fallbackTasks[0]?.id || speakingTasks[0].id,
                    );
                    setFeedback(null);
                    setError("");
                  }}
                  disabled={
                    liveSessionActive ||
                    status === "connecting" ||
                    status === "processing"
                  }
                  className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cefrLevels.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-neutral-700">Speaking task</span>
                <select
                  value={activeTask.id}
                  onChange={(event) => {
                    setSelectedTaskId(event.target.value);
                    setFeedback(null);
                    setError("");
                  }}
                  disabled={
                    liveSessionActive ||
                    status === "connecting" ||
                    status === "processing"
                  }
                  className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {visibleTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-semibold text-neutral-800">{activeTask.title}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{activeTask.prompt}</p>
              {activeTask.target ? (
                <p className="mt-3 rounded-md bg-white p-3 text-sm font-medium text-neutral-900">
                  {activeTask.target}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {activeTask.successCriteria.map((criterion) => (
                  <span
                    key={criterion}
                    className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700"
                  >
                    {criterion}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={playModelSentence}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
            >
              <Volume2 className="h-4 w-4" />
              Play model line
            </button>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startLiveSession}
                disabled={
                  liveSessionActive ||
                  status === "connecting" ||
                  status === "processing"
                }
                className="flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "connecting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                Start live mic
              </button>
              <button
                type="button"
                onClick={stopAndAnalyze}
                disabled={!liveSessionActive}
                className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MicOff className="h-4 w-4" />
                Stop and analyze
              </button>
              <button
                type="button"
                onClick={() => analyzeTranscript(manualTranscript || transcript)}
                disabled={
                  status === "processing" ||
                  status === "connecting" ||
                  !(manualTranscript.trim() || transcript.trim())
                }
                className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Analyze transcript
              </button>
              <label
                className={cn(
                  "flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold",
                  status === "processing" || status === "connecting"
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-neutral-50",
                )}
              >
                <Upload className="h-4 w-4" />
                Upload audio
                <input
                  type="file"
                  accept="audio/*,.webm,.mp3,.m4a,.wav"
                  disabled={status === "processing" || status === "connecting"}
                  className="sr-only"
                  onChange={(event) => {
                    void handleAudioUpload(event.target.files?.[0] || null);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {error ? (
              <div className="mt-4 flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <p>{error}</p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-800">Live transcript</p>
                  {status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                  ) : null}
                </div>
                <div className="min-h-52 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
                  {transcript || liveTranscript ? (
                    <>
                      {transcript}
                      {liveTranscript ? (
                        <span className="text-teal-800"> {liveTranscript}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-neutral-500">
                      Your German transcript will appear here.
                    </span>
                  )}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-neutral-800">
                  Paste transcript fallback
                </span>
                <textarea
                  value={manualTranscript}
                  onChange={(event) => setManualTranscript(event.target.value)}
                  className="min-h-52 w-full resize-none rounded-lg border border-neutral-200 bg-white p-4 text-sm leading-6"
                  placeholder="Ich heisse Alex und ich wohne in Berlin..."
                />
              </label>
            </div>
          </div>
        </div>

        {feedback ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                  AI correction
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                  {feedback.cefrLevel} speaking estimate
                </h2>
              </div>
              <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                {feedbackSource === "demo" ? "Demo" : "OpenAI"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <FeedbackPanel title="Correct German" value={feedback.correctedGerman} />
              <FeedbackPanel title="Explanation" value={feedback.englishExplanation} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <ScorePanel label="Fluency" score={feedback.fluencyScore} />
              <ScorePanel label="Task completion" score={feedback.taskCompletionScore} />
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="text-sm font-semibold text-neutral-700">Retry prompt</p>
                <p className="mt-2 text-sm leading-6 text-neutral-900">
                  {feedback.retryPrompt}
                </p>
                <button
                  type="button"
                  onClick={playModelSentence}
                  className="mt-3 flex items-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  <Play className="h-4 w-4" />
                  Hear retry
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <IssueList
                title="Pronunciation practice"
                items={feedback.pronunciationIssues}
              />
              <IssueList
                title="Grammar"
                items={feedback.grammarMistakes.map(
                  (item) => `${item.issue}: ${item.correction}`,
                )}
              />
              <IssueList
                title="Vocabulary"
                items={feedback.vocabularyAlternatives.map(
                  (item) => `${item.original} -> ${item.better}`,
                )}
              />
            </div>

            <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4">
              <p className="text-sm font-semibold text-teal-950">Next drill</p>
              <p className="mt-1 text-sm text-teal-950">{feedback.nextDrill}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {feedback.weakTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-900"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "mt-5 flex items-start gap-3 rounded-lg border p-4",
                saveStatus === "error"
                  ? "border-amber-200 bg-amber-50"
                  : "border-neutral-200 bg-neutral-50",
              )}
            >
              {saveStatus === "saving" ? (
                <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-teal-700" />
              ) : (
                <Save className="mt-0.5 h-4 w-4 text-teal-700" />
              )}
              <div>
                <p className="text-sm font-semibold">Persistence</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">
                  {saveMessage || "This attempt has not been saved yet."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <aside className="space-y-5">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Attempt history
          </p>
          <div className="mt-4 space-y-3">
            {attempts.length ? (
              attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{attempt.taskTitle}</p>
                    <span className="text-xs font-semibold text-teal-700">
                      {attempt.cefr}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-600">
                    {attempt.transcript}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-neutral-200">
                    <div
                      className="h-2 rounded-full bg-teal-700"
                      style={{ width: `${attempt.score}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-neutral-600">
                Completed speaking attempts will appear here during this session.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-700" />
            <p className="text-sm font-semibold">Production guardrails</p>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
            <li>Raw OpenAI key stays on the server.</li>
            <li>Browser receives only a short-lived realtime client secret.</li>
            <li>Save status is confirmed after every completed attempt.</li>
            <li>Transcripts and feedback are saved; raw audio is not stored.</li>
            <li>
              Pronunciation notes are practice suggestions inferred from the transcript,
              not acoustic phoneme scoring.
            </li>
            <li>Scores are practice estimates, not official exam grades.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-amber-700" />
            <p className="text-sm font-semibold">Fallback path</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-700">
            If live WebRTC voice fails, upload a short German audio clip or paste the
            transcript and run the same correction engine.
          </p>
          <button
            type="button"
            onClick={() => {
              closeRealtimeSession();
              window.speechSynthesis?.cancel();
              setTranscript("");
              setLiveTranscriptValue("");
              setManualTranscript("");
              setFeedback(null);
              setFeedbackSource(null);
              setError("");
              setSaveStatus("idle");
              setSaveMessage("");
              setStatus("idle");
            }}
            className="mt-4 flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset lab
          </button>
        </div>
      </aside>
    </div>
  );
}

function FeedbackPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-900">{value}</p>
    </div>
  );
}

function ScorePanel({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-700">{label}</p>
        <span className="text-xl font-semibold">{score}</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-neutral-200">
        <div className="h-2 rounded-full bg-teal-700" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function IssueList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-neutral-800">
        {items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>No major issue.</li>}
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

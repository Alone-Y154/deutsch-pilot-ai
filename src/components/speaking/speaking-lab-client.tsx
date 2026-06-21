"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  Loader2,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
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
import { SpeechPlaybackControls } from "@/components/audio/speech-playback-controls";
import { useSpeechPlayback } from "@/hooks/use-speech-playback";
import { convertRecordingToWav } from "@/lib/audio-recording";
import type { SpeechFeedback } from "@/lib/ai/schemas";
import type { SpeakingPracticeTask } from "@/lib/speaking-task-model";
import { getSpeakingModeBehavior } from "@/lib/realtime-speaking-config";
import {
  applyTranscriptUpdate,
  compareAttemptScores,
  conversationTranscript,
  learnerTranscript,
  readRealtimeTranscriptUpdate,
  roleplayIsComplete,
  setTurnTranslation,
  type TranscriptTurn,
} from "@/lib/speaking-session";
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
  recorder: MediaRecorder | null;
  recordedChunks: Blob[];
};

type FeedbackResponse = {
  transcript?: string;
  feedback: SpeechFeedback;
  source: "openai" | "demo";
  analysisBasis?: "audio" | "transcript";
  audioWarning?: string;
};

type Attempt = {
  id: string;
  taskId: string;
  taskTitle: string;
  transcript: string;
  fluencyScore: number;
  taskCompletionScore: number;
  cefr: string;
};

type AttemptComparison = NonNullable<
  ReturnType<typeof compareAttemptScores>
>;

type SaveStatus = "idle" | "saving" | "saved" | "error";
type TaskActionStatus = "idle" | "loading" | "saving";
type RoleplayPhase =
  | "idle"
  | "ai-speaking"
  | "user-speaking"
  | "waiting"
  | "complete";

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
  const [transcriptTurns, setTranscriptTurns] = useState<TranscriptTurn[]>([]);
  const [feedback, setFeedback] = useState<SpeechFeedback | null>(null);
  const [feedbackSource, setFeedbackSource] = useState<"openai" | "demo" | null>(null);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [liveSessionActive, setLiveSessionActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [savedTasks, setSavedTasks] = useState<SpeakingPracticeTask[]>([]);
  const [taskActionStatus, setTaskActionStatus] =
    useState<TaskActionStatus>("idle");
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskText, setCustomTaskText] = useState("");
  const [roleplayPhase, setRoleplayPhase] = useState<RoleplayPhase>("idle");
  const [roleplayUserChunks, setRoleplayUserChunks] = useState(0);
  const [feedbackBasis, setFeedbackBasis] = useState<
    "audio" | "transcript" | null
  >(null);
  const [feedbackWarning, setFeedbackWarning] = useState("");
  const [attemptComparison, setAttemptComparison] =
    useState<AttemptComparison | null>(null);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const transcriptTurnsRef = useRef<TranscriptTurn[]>([]);
  const intentionalCloseRef = useRef(false);
  const pendingRoleplayResponseRef = useRef(false);
  const roleplayUserChunksRef = useRef(0);
  const roleplayAssistantRepliesRef = useRef(0);
  const roleplaySpeechActiveRef = useRef(false);
  const attemptsRef = useRef<Attempt[]>([]);
  const speechPlayback = useSpeechPlayback({ rate: 0.86 });

  const allSpeakingTasks = useMemo(
    () => [
      ...speakingTasks.map((task) => ({ ...task, source: "built-in" as const })),
      ...savedTasks,
    ],
    [savedTasks],
  );

  const visibleTasks = useMemo(() => {
    const exact = allSpeakingTasks.filter(
      (task) => task.mode === selectedMode && task.level === selectedLevel,
    );

    if (exact.length > 0) {
      return exact;
    }

    return allSpeakingTasks.filter((task) => task.mode === selectedMode);
  }, [allSpeakingTasks, selectedLevel, selectedMode]);

  const activeTask: SpeakingTask | SpeakingPracticeTask =
    visibleTasks.find((task) => task.id === selectedTaskId) ||
    visibleTasks[0] ||
    speakingTasks[0];
  const modelSentence = activeTask.target || activeTask.prompt;
  const retrySentence = feedback?.retryPrompt || modelSentence;
  const modeBehavior = getSpeakingModeBehavior(selectedMode);

  useEffect(() => {
    void loadSavedTasks();
  }, []);

  useEffect(() => {
    return () => {
      closeRealtimeSession();
    };
  }, []);

  async function loadSavedTasks() {
    try {
      const response = await fetch("/api/speaking-tasks");
      const data = (await response.json()) as {
        tasks?: SpeakingPracticeTask[];
      };
      if (response.ok && Array.isArray(data.tasks)) {
        setSavedTasks(data.tasks);
      }
    } catch {
      // Built-in tasks remain available if persisted tasks cannot be loaded.
    }
  }

  async function createSpeakingTask(action: "generate" | "custom") {
    if (action === "custom" && !customTaskText.trim()) {
      setError("Enter German text or a speaking prompt before saving your task.");
      return;
    }

    setError("");
    setTaskActionStatus(action === "generate" ? "loading" : "saving");

    try {
      const response = await fetch("/api/speaking-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          mode: selectedMode,
          level: selectedLevel,
          title: customTaskTitle,
          text: customTaskText,
          existingTitles: visibleTasks.map((task) => task.title),
        }),
      });
      const data = (await response.json()) as {
        task?: SpeakingPracticeTask;
        error?: string;
      };

      if (!response.ok || !data.task) {
        throw new Error(data.error || "Speaking task creation failed.");
      }

      setSavedTasks((current) => [
        data.task!,
        ...current.filter((task) => task.id !== data.task!.id),
      ]);
      setSelectedTaskId(data.task.id);
      setFeedback(null);
      setCustomTaskTitle("");
      setCustomTaskText("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Speaking task creation failed.",
      );
    } finally {
      setTaskActionStatus("idle");
    }
  }

  function updateTranscriptTurns(
    updater: (current: TranscriptTurn[]) => TranscriptTurn[],
  ) {
    const next = updater(transcriptTurnsRef.current);
    transcriptTurnsRef.current = next;
    setTranscriptTurns(next);
  }

  async function translateTranscriptTurn(itemId: string, german: string) {
    try {
      const response = await fetch("/api/ai/speaking-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: german }),
      });
      const data = (await response.json()) as {
        translation?: string;
        error?: string;
      };

      if (!response.ok || !data.translation) {
        throw new Error(data.error || "Translation failed.");
      }

      updateTranscriptTurns((current) =>
        setTurnTranslation(current, itemId, data.translation || ""),
      );
    } catch {
      updateTranscriptTurns((current) =>
        setTurnTranslation(
          current,
          itemId,
          "English translation could not be generated.",
          true,
        ),
      );
    }
  }

  async function startLiveSession() {
    closeRealtimeSession();
    speechPlayback.stop();
    setError("");
    setFeedback(null);
    setFeedbackSource(null);
    setFeedbackBasis(null);
    setFeedbackWarning("");
    setAttemptComparison(null);
    transcriptTurnsRef.current = [];
    setTranscriptTurns([]);
    setSaveStatus("idle");
    setSaveMessage("");
    setRoleplayPhase(selectedMode === "roleplay" ? "ai-speaking" : "idle");
    roleplayUserChunksRef.current = 0;
    roleplayAssistantRepliesRef.current = 0;
    roleplaySpeechActiveRef.current = false;
    pendingRoleplayResponseRef.current = false;
    setRoleplayUserChunks(0);
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
      const recordedChunks: Blob[] = [];
      const recorder = createSessionRecorder(stream, recordedChunks);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");
      dc.addEventListener("message", handleRealtimeMessage);
      dc.addEventListener("error", () => {
        if (!intentionalCloseRef.current) {
          setError("The live voice connection was interrupted. Use audio upload instead.");
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
        if (selectedMode === "roleplay") {
          setMicrophoneEnabled(false);
          requestRoleplayResponse();
        }
      });

      sessionRef.current = {
        pc,
        dc,
        stream,
        audioElement,
        recorder,
        recordedChunks,
      };
      recorder?.start(1000);
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
    const combinedTranscript = learnerTranscript(transcriptTurnsRef.current);
    const session = sessionRef.current;
    let recording: File | null = null;

    try {
      recording = await stopSessionRecording(session);
    } catch (caughtError) {
      setFeedbackWarning(
        caughtError instanceof Error
          ? caughtError.message
          : "The microphone recording could not be prepared for audio analysis.",
      );
    }

    closeRealtimeSession();

    if (recording) {
      await analyzeAudioFile(recording, false);
      return;
    }

    await analyzeTranscript(combinedTranscript);
  }

  async function analyzeTranscript(rawTranscript: string) {
    const cleanTranscript = rawTranscript.trim();

    if (!cleanTranscript) {
      setError("Speak live or upload an audio recording before analysis.");
      setStatus("error");
      return;
    }

    setError("");
    setStatus("processing");
    setFeedbackBasis(null);
    setFeedbackWarning("");

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
          conversationTranscript: conversationTranscript(
            transcriptTurnsRef.current,
          ),
        }),
      });

      const data = (await response.json()) as FeedbackResponse | { error?: string };

      if (!response.ok || !("feedback" in data)) {
        throw new Error(readErrorMessage(data, "Feedback generation failed."));
      }

      setFeedback(data.feedback);
      setFeedbackSource(data.source);
      setFeedbackBasis("transcript");
      setStatus("feedback");
      registerAttempt(cleanTranscript, data.feedback);
      await persistAttempt(cleanTranscript, data.feedback, "transcript");
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
    await analyzeAudioFile(file, true);
  }

  async function analyzeAudioFile(file: File, replaceTranscript: boolean) {
    setError("");
    setFeedback(null);
    setFeedbackBasis(null);
    setFeedbackWarning("");
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
    formData.append(
      "conversationTranscript",
      conversationTranscript(transcriptTurnsRef.current),
    );

    try {
      const response = await fetch("/api/ai/transcribe-upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as
        | FeedbackResponse
        | { error?: string };

      if (!response.ok || !("feedback" in data)) {
        throw new Error(readErrorMessage(data, "Audio upload analysis failed."));
      }

      const uploadedTranscript = data.transcript || "";

      if (replaceTranscript || !transcriptTurnsRef.current.length) {
        const itemId = crypto.randomUUID();
        const uploadedTurn: TranscriptTurn = {
          id: itemId,
          role: "user",
          german: uploadedTranscript,
          english: "",
          translationStatus: "loading",
          complete: true,
        };
        transcriptTurnsRef.current = [uploadedTurn];
        setTranscriptTurns([uploadedTurn]);
        void translateTranscriptTurn(itemId, uploadedTranscript);
      }

      setFeedback(data.feedback);
      setFeedbackSource(data.source);
      setFeedbackBasis(data.analysisBasis || "transcript");
      setFeedbackWarning(data.audioWarning || "");
      setStatus("feedback");
      registerAttempt(uploadedTranscript, data.feedback);
      await persistAttempt(
        uploadedTranscript,
        data.feedback,
        data.analysisBasis || "transcript",
      );
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
      const update = readRealtimeTranscriptUpdate(event);

      if (!update) {
        return;
      }

      if (update.kind === "speech-started") {
        roleplaySpeechActiveRef.current = true;
        setStatus("speech");
        return;
      }

      if (update.kind === "speech-stopped") {
        roleplaySpeechActiveRef.current = false;
        setStatus("listening");
        return;
      }

      if (update.kind === "error") {
        setError(update.message);
        setStatus("error");
        return;
      }

      if (update.kind === "transcript") {
        updateTranscriptTurns((current) => applyTranscriptUpdate(current, update));
        if (update.complete && update.text.trim()) {
          void translateTranscriptTurn(update.itemId, update.text);
          if (selectedMode === "roleplay" && update.role === "user") {
            roleplayUserChunksRef.current += 1;
            setRoleplayUserChunks(roleplayUserChunksRef.current);
            if (pendingRoleplayResponseRef.current) {
              requestRoleplayResponse();
            }
          }
        }
        return;
      }

      if (update.kind === "response-started" && selectedMode === "roleplay") {
        setRoleplayPhase("ai-speaking");
        setMicrophoneEnabled(false);
        return;
      }

      if (update.kind === "response-done" && selectedMode === "roleplay") {
        roleplayAssistantRepliesRef.current += 1;
        pendingRoleplayResponseRef.current = false;

        if (
          roleplayIsComplete(
            transcriptTurnsRef.current,
            roleplayAssistantRepliesRef.current,
          )
        ) {
          setRoleplayPhase("complete");
          setMicrophoneEnabled(false);
        } else {
          roleplayUserChunksRef.current = 0;
          setRoleplayUserChunks(0);
          setRoleplayPhase("user-speaking");
          setMicrophoneEnabled(true);
          setStatus("listening");
        }
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
    if (session.recorder && session.recorder.state !== "inactive") {
      session.recorder.stop();
    }
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

  async function stopSessionRecording(session: RealtimeSession | null) {
    if (!session?.recorder) {
      return null;
    }

    if (session.recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        session.recorder!.addEventListener("stop", () => resolve(), {
          once: true,
        });
        session.recorder!.stop();
      });
    }

    if (!session.recordedChunks.length) {
      return null;
    }

    const recording = new Blob(session.recordedChunks, {
      type: session.recorder.mimeType || "audio/webm",
    });
    return convertRecordingToWav(recording);
  }

  function setMicrophoneEnabled(enabled: boolean) {
    sessionRef.current?.stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  function requestRoleplayResponse() {
    const session = sessionRef.current;

    if (!session || session.dc.readyState !== "open") {
      return;
    }

    pendingRoleplayResponseRef.current = false;
    roleplayUserChunksRef.current = 0;
    setRoleplayUserChunks(0);
    setMicrophoneEnabled(false);
    setRoleplayPhase("ai-speaking");
    session.dc.send(
      JSON.stringify({
        type: "response.create",
        response:
          roleplayAssistantRepliesRef.current >= 5
            ? {
                instructions:
                  'End the roleplay now. Say exactly: "Die Aufgabe ist abgeschlossen. Klicke jetzt auf Analysieren."',
              }
            : undefined,
      }),
    );
  }

  function finishRoleplayTurn() {
    if (
      selectedMode !== "roleplay" ||
      roleplayPhase !== "user-speaking" ||
      roleplayUserChunksRef.current < 1
    ) {
      return;
    }

    setMicrophoneEnabled(false);
    setRoleplayPhase("waiting");

    if (roleplaySpeechActiveRef.current) {
      pendingRoleplayResponseRef.current = true;
      return;
    }

    requestRoleplayResponse();
  }

  function registerAttempt(rawTranscript: string, result: SpeechFeedback) {
    const previous =
      attemptsRef.current.find((attempt) => attempt.taskId === activeTask.id) ||
      null;
    const nextAttempt: Attempt = {
      id: crypto.randomUUID(),
      taskId: activeTask.id,
      taskTitle: activeTask.title,
      transcript: rawTranscript,
      fluencyScore: result.fluencyScore,
      taskCompletionScore: result.taskCompletionScore,
      cefr: result.cefrLevel,
    };
    const next = [nextAttempt, ...attemptsRef.current];
    attemptsRef.current = next;
    setAttempts(next);
    setAttemptComparison(
      compareAttemptScores(previous, {
        fluencyScore: result.fluencyScore,
        taskCompletionScore: result.taskCompletionScore,
      }),
    );
  }

  async function persistAttempt(
    rawTranscript: string,
    result: SpeechFeedback,
    analysisBasis: "audio" | "transcript",
  ) {
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
          analysisBasis,
          transcriptTurns: transcriptTurnsRef.current,
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

  function prepareRetake() {
    closeRealtimeSession();
    speechPlayback.stop();
    transcriptTurnsRef.current = [];
    setTranscriptTurns([]);
    setFeedback(null);
    setFeedbackSource(null);
    setFeedbackBasis(null);
    setFeedbackWarning("");
    setAttemptComparison(null);
    setError("");
    setSaveStatus("idle");
    setSaveMessage("");
    setRoleplayPhase("idle");
    roleplayUserChunksRef.current = 0;
    roleplayAssistantRepliesRef.current = 0;
    roleplaySpeechActiveRef.current = false;
    pendingRoleplayResponseRef.current = false;
    setRoleplayUserChunks(0);
    setStatus("idle");
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
                    speechPlayback.stop();
                    setSelectedMode(mode.id);
                    const nextTasks = allSpeakingTasks.filter(
                      (task) =>
                        task.mode === mode.id && task.level === selectedLevel,
                    );
                    const fallbackTasks = allSpeakingTasks.filter(
                      (task) => task.mode === mode.id,
                    );
                    setSelectedTaskId(
                      nextTasks[0]?.id || fallbackTasks[0]?.id || speakingTasks[0].id,
                    );
                    setFeedback(null);
                    setError("");
                    setRoleplayPhase("idle");
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
                    speechPlayback.stop();
                    const nextLevel = event.target.value as CefrLevel;
                    setSelectedLevel(nextLevel);
                    const nextTasks = allSpeakingTasks.filter(
                      (task) =>
                        task.mode === selectedMode && task.level === nextLevel,
                    );
                    const fallbackTasks = allSpeakingTasks.filter(
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
                    speechPlayback.stop();
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

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">
                      Your task library
                    </p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">
                      Generated and custom tasks are saved to your account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void createSpeakingTask("generate")}
                    disabled={
                      taskActionStatus !== "idle" ||
                      liveSessionActive ||
                      status === "processing"
                    }
                    className="flex shrink-0 items-center gap-2 rounded-md border border-teal-700 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {taskActionStatus === "loading" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate
                  </button>
                </div>

                <input
                  value={customTaskTitle}
                  onChange={(event) => setCustomTaskTitle(event.target.value)}
                  disabled={taskActionStatus !== "idle" || liveSessionActive}
                  placeholder="Optional task title"
                  className="mt-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs"
                />
                <textarea
                  value={customTaskText}
                  onChange={(event) => setCustomTaskText(event.target.value)}
                  disabled={taskActionStatus !== "idle" || liveSessionActive}
                  placeholder={customTaskPlaceholder(selectedMode)}
                  className="mt-2 min-h-24 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs leading-5"
                />
                <button
                  type="button"
                  onClick={() => void createSpeakingTask("custom")}
                  disabled={
                    taskActionStatus !== "idle" ||
                    liveSessionActive ||
                    !customTaskText.trim()
                  }
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {taskActionStatus === "saving" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Save my task
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-neutral-800">
                  {activeTask.title}
                </p>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  {activeTask.source || "built-in"}
                </span>
              </div>
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

            <SpeechPlaybackControls
              controller={speechPlayback}
              id={`speaking-model-${activeTask.id}`}
              text={modelSentence}
              playLabel="Play model line"
              className="mt-4"
            />
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
                {modeBehavior.startLabel}
              </button>
              <button
                type="button"
                onClick={stopAndAnalyze}
                disabled={!liveSessionActive}
                className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MicOff className="h-4 w-4" />
                {modeBehavior.stopLabel}
              </button>
              {selectedMode === "roleplay" ? (
                <button
                  type="button"
                  onClick={finishRoleplayTurn}
                  disabled={
                    !liveSessionActive ||
                    roleplayPhase !== "user-speaking" ||
                    roleplayUserChunks < 1
                  }
                  className="flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MicOff className="h-4 w-4" />
                  I&apos;m done speaking
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  analyzeTranscript(learnerTranscript(transcriptTurnsRef.current))
                }
                disabled={
                  status === "processing" ||
                  status === "connecting" ||
                  !learnerTranscript(transcriptTurns).trim()
                }
                className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Analyze captured speech
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

            {selectedMode === "roleplay" && liveSessionActive ? (
              <div
                className={cn(
                  "mt-4 rounded-lg border p-3 text-sm",
                  roleplayPhase === "complete"
                    ? "border-teal-200 bg-teal-50 text-teal-950"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700",
                )}
              >
                {roleplayPhase === "ai-speaking"
                  ? "AI is replying. Your microphone is paused until the reply finishes."
                  : roleplayPhase === "waiting"
                    ? "Finishing your turn before the AI replies..."
                    : roleplayPhase === "complete"
                      ? "The roleplay is complete. Click End and analyze for your feedback."
                      : "Speak naturally. The AI waits until you click “I’m done speaking.”"}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-800">
                    Live German transcript
                  </p>
                  {status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                  ) : null}
                </div>
                <div className="min-h-52 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-800">
                  {transcriptTurns.length ? (
                    transcriptTurns.map((turn) => (
                      <TranscriptBubble
                        key={turn.id}
                        label={turn.role === "user" ? "User" : "AI"}
                        value={turn.german}
                        active={!turn.complete}
                      />
                    ))
                  ) : (
                    <span className="text-neutral-500">
                      User and AI German turns will appear here.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-neutral-800">
                  English transcript
                </p>
                <div className="min-h-52 space-y-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-800">
                  {transcriptTurns.length ? (
                    transcriptTurns.map((turn) => (
                      <TranscriptBubble
                        key={turn.id}
                        label={turn.role === "user" ? "User" : "AI"}
                        value={
                          turn.translationStatus === "loading"
                            ? "Translating..."
                            : turn.translationStatus === "idle"
                              ? "Translation appears when this turn is complete."
                              : turn.english
                        }
                        muted={turn.translationStatus !== "ready"}
                      />
                    ))
                  ) : (
                    <span className="text-neutral-500">
                      English translations will stay aligned with each German turn.
                    </span>
                  )}
                </div>
              </div>
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
              <div className="flex flex-wrap justify-end gap-2">
                <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {feedbackSource === "demo" ? "Demo" : "OpenAI"}
                </span>
                {feedbackBasis ? (
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                      feedbackBasis === "audio"
                        ? "border-teal-200 bg-teal-50 text-teal-800"
                        : "border-amber-200 bg-amber-50 text-amber-800",
                    )}
                  >
                    {feedbackBasis === "audio"
                      ? "Audio-aware"
                      : "Transcript-based"}
                  </span>
                ) : null}
              </div>
            </div>

            {feedbackWarning ? (
              <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <p>
                  Audio-aware analysis was unavailable, so this attempt used the
                  transcript: {feedbackWarning}
                </p>
              </div>
            ) : null}

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
                <SpeechPlaybackControls
                  controller={speechPlayback}
                  id={`speaking-retry-${activeTask.id}`}
                  text={retrySentence}
                  playLabel="Hear retry"
                  className="mt-3"
                />
              </div>
            </div>

            {attemptComparison ? (
              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-950">
                  Improvement from your previous attempt
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ImprovementMetric
                    label="Fluency"
                    previous={attemptComparison.previousFluency}
                    current={attemptComparison.currentFluency}
                    delta={attemptComparison.fluencyDelta}
                  />
                  <ImprovementMetric
                    label="Task completion"
                    previous={attemptComparison.previousTaskCompletion}
                    current={attemptComparison.currentTaskCompletion}
                    delta={attemptComparison.taskCompletionDelta}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <IssueList
                title={
                  feedbackBasis === "audio"
                    ? "Pronunciation and delivery"
                    : "Pronunciation practice"
                }
                items={feedback.pronunciationIssues}
              />
              <IssueList
                title="Grammar"
                items={feedback.grammarMistakes.map(
                  (item) => `${item.issue}: ${item.correction}`,
                )}
              />
              <IssueList
                title="Vocabulary to use next time"
                items={feedback.vocabularyAlternatives.map(
                  (item) => `${item.original} → ${item.better}: ${item.reason}`,
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

            <button
              type="button"
              onClick={prepareRetake}
              className="mt-5 flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <RotateCcw className="h-4 w-4" />
              Retake this task
            </button>
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
                      style={{ width: `${attempt.fluencyScore}%` }}
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
            <li>
              Raw audio can be analyzed for delivery, then is discarded; transcripts
              and feedback are saved.
            </li>
            <li>
              Audio-aware attempts use audible delivery; transcript fallback is labeled
              clearly and never claims acoustic phoneme scoring.
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
            If live WebRTC voice fails, upload a short German audio clip and run the
            same correction engine.
          </p>
          <button
            type="button"
            onClick={() => {
              closeRealtimeSession();
              speechPlayback.stop();
              transcriptTurnsRef.current = [];
              setTranscriptTurns([]);
              setFeedback(null);
              setFeedbackSource(null);
              setFeedbackBasis(null);
              setFeedbackWarning("");
              setError("");
              setSaveStatus("idle");
              setSaveMessage("");
              setRoleplayPhase("idle");
              roleplayUserChunksRef.current = 0;
              roleplayAssistantRepliesRef.current = 0;
              roleplaySpeechActiveRef.current = false;
              pendingRoleplayResponseRef.current = false;
              setRoleplayUserChunks(0);
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

function TranscriptBubble({
  label,
  value,
  active = false,
  muted = false,
}: {
  label: string;
  value: string;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
          {label}
        </p>
        {active ? (
          <span className="text-xs font-medium text-teal-700">Live</span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 whitespace-pre-wrap text-sm leading-6",
          muted ? "text-neutral-500" : "text-neutral-900",
        )}
      >
        {value}
      </p>
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

function ImprovementMetric({
  label,
  previous,
  current,
  delta,
}: {
  label: string;
  previous: number;
  current: number;
  delta: number;
}) {
  return (
    <div className="rounded-md border border-blue-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-800">{label}</p>
        <span
          className={cn(
            "text-sm font-semibold",
            delta > 0
              ? "text-teal-700"
              : delta < 0
                ? "text-rose-700"
                : "text-neutral-600",
          )}
        >
          {delta > 0 ? "+" : ""}
          {delta}
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-600">
        {previous} → {current}
      </p>
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

function customTaskPlaceholder(mode: SpeakingMode) {
  const placeholders: Record<SpeakingMode, string> = {
    pronunciation: "Enter the German text you want to pronounce...",
    roleplay: "Describe the situation, roles, and what you want to achieve...",
    exam: "Enter a topic you want to speak about without interruption...",
    "weak-spot": "Enter a grammar or vocabulary speaking challenge...",
    shadow: "Paste the longer German passage you want to shadow...",
  };
  return placeholders[mode];
}

function createSessionRecorder(stream: MediaStream, chunks: Blob[]) {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  const preferredMimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  const mimeType = preferredMimeTypes.find((type) =>
    MediaRecorder.isTypeSupported(type),
  );

  try {
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });
    return recorder;
  } catch {
    return null;
  }
}

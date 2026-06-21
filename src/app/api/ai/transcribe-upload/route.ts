import { analyzeSpeechAudio } from "@/lib/ai/audio-speech-feedback";
import { generateSpeechFeedback } from "@/lib/ai/speech-feedback";

export const runtime = "nodejs";

const maxAudioUploadBytes = 8 * 1024 * 1024;
const allowedAudioExtensions = [".webm", ".mp3", ".m4a", ".wav", ".ogg", ".mp4"];

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY is required for audio upload transcription. You can still paste a transcript for demo feedback.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return Response.json(
      { error: "Upload an audio file under the 'audio' field." },
      { status: 400 },
    );
  }

  const extension = audio.name.includes(".")
    ? `.${audio.name.split(".").pop()?.toLowerCase()}`
    : "";

  if (audio.size > maxAudioUploadBytes) {
    return Response.json(
      { error: "Audio uploads must be 8 MB or smaller." },
      { status: 413 },
    );
  }

  if (
    !audio.type.startsWith("audio/") &&
    !allowedAudioExtensions.includes(extension)
  ) {
    return Response.json(
      { error: "Unsupported audio format." },
      { status: 415 },
    );
  }

  const taskTitle = readFormString(formData, "taskTitle") || "German speaking task";
  const taskPrompt = readFormString(formData, "taskPrompt") || "Speak in German.";
  const mode = readFormString(formData, "mode") || "speaking-practice";
  const level = readFormString(formData, "level") || "A1";
  const target = readFormString(formData, "target");
  const conversationTranscript = readFormString(
    formData,
    "conversationTranscript",
  );

  const openAIForm = new FormData();
  openAIForm.append("file", audio, audio.name || "speaking-attempt.webm");
  openAIForm.append(
    "model",
    process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
  );
  openAIForm.append("language", "de");
  openAIForm.append("response_format", "json");
  openAIForm.append(
    "prompt",
    "German learner speech. Preserve spoken German and learner errors.",
  );

  const transcriptResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: openAIForm,
  });

  const transcriptData: unknown = await transcriptResponse.json();

  if (!transcriptResponse.ok) {
    return Response.json(
      { error: getOpenAIErrorMessage(transcriptData), details: transcriptData },
      { status: transcriptResponse.status },
    );
  }

  const transcript = extractTranscript(transcriptData);

  if (!transcript) {
    return Response.json(
      { error: "Transcription completed without text.", details: transcriptData },
      { status: 502 },
    );
  }

  const feedbackInput = {
    transcript,
    mode,
    level,
    taskTitle,
    taskPrompt,
    target: target || undefined,
    conversationTranscript: conversationTranscript || undefined,
  };
  let acousticObservations = "";
  let audioWarning = "";

  try {
    acousticObservations = await analyzeSpeechAudio(audio, feedbackInput);
  } catch (error) {
    audioWarning =
      error instanceof Error
        ? error.message
        : "Audio-aware assessment was unavailable.";
  }

  const feedback = await generateSpeechFeedback({
    ...feedbackInput,
    acousticObservations: acousticObservations || undefined,
  });

  return Response.json({
    transcript,
    analysisBasis: acousticObservations ? "audio" : "transcript",
    audioWarning: audioWarning || undefined,
    ...feedback,
  });
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function extractTranscript(data: unknown) {
  if (isRecord(data) && typeof data.text === "string") {
    return data.text;
  }

  return "";
}

function getOpenAIErrorMessage(data: unknown) {
  if (
    isRecord(data) &&
    isRecord(data.error) &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }

  return "Audio transcription failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

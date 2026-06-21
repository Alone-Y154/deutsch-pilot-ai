import "server-only";

import type { SpeechFeedbackRequest } from "@/lib/ai/speech-feedback";
import { getOpenAIErrorMessage, isRecord } from "@/lib/ai/response-utils";

const chatCompletionsUrl = "https://api.openai.com/v1/chat/completions";

export async function analyzeSpeechAudio(
  audio: File,
  input: SpeechFeedbackRequest,
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for audio-aware feedback.");
  }

  const format = audioFormat(audio);
  const base64Audio = Buffer.from(await audio.arrayBuffer()).toString("base64");
  const response = await fetch(chatCompletionsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_AUDIO_FEEDBACK_MODEL || "gpt-audio-1.5",
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: "wav" },
      messages: [
        {
          role: "system",
          content:
            "You are an acoustic German speaking assessor. Listen to the recording itself. Give concise English observations about audible pronunciation, clarity, rhythm, pacing, pauses, stress, and confidence. Do not infer details you cannot hear and do not assign a final score.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                mode: input.mode,
                level: input.level,
                taskTitle: input.taskTitle,
                taskPrompt: input.taskPrompt,
                targetText: input.target || "",
                transcript: input.transcript,
                instruction:
                  "Compare the audible delivery with the target when a target exists. For shadowing, focus on sustained rhythm, phrasing, stress, clarity, and whether the passage sounds continuously read. Return short plain-text observations.",
              }),
            },
            {
              type: "input_audio",
              input_audio: {
                data: base64Audio,
                format,
              },
            },
          ],
        },
      ],
      store: false,
    }),
  });
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getOpenAIErrorMessage(data));
  }

  const observations = extractAudioResponseText(data);

  if (!observations) {
    throw new Error("The audio model returned no acoustic observations.");
  }

  return observations;
}

function audioFormat(audio: File): "wav" | "mp3" {
  const extension = audio.name.split(".").pop()?.toLowerCase();

  if (audio.type.includes("wav") || extension === "wav") {
    return "wav";
  }
  if (audio.type.includes("mpeg") || extension === "mp3") {
    return "mp3";
  }

  throw new Error(
    "Audio-aware assessment currently requires WAV or MP3 input.",
  );
}

function extractAudioResponseText(data: unknown) {
  if (!isRecord(data) || !Array.isArray(data.choices)) {
    return "";
  }

  const first = data.choices[0];
  if (!isRecord(first) || !isRecord(first.message)) {
    return "";
  }

  if (typeof first.message.content === "string" && first.message.content.trim()) {
    return first.message.content.trim();
  }

  if (
    isRecord(first.message.audio) &&
    typeof first.message.audio.transcript === "string"
  ) {
    return first.message.audio.transcript.trim();
  }

  return "";
}

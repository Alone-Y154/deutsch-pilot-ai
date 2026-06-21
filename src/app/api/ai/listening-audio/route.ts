import { isRecord } from "@/lib/ai/response-utils";

export const runtime = "nodejs";

const maxListeningCharacters = 4_000;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is required for generated listening audio." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    text?: unknown;
    level?: unknown;
    format?: unknown;
  } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return Response.json({ error: "Listening text is required." }, { status: 400 });
  }

  if (text.length > maxListeningCharacters) {
    return Response.json(
      { error: "Listening text is too long for one audio exercise." },
      { status: 413 },
    );
  }

  const level = typeof body?.level === "string" ? body.level : "B1";
  const format = typeof body?.format === "string" ? body.format : "dialogue";
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE || "marin",
      input: text,
      instructions: `Speak natural standard German for a ${level} learner. The format is ${format}. Use clear articulation, realistic pauses, and a natural German cadence. Do not add or omit words.`,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    return Response.json(
      { error: readOpenAIError(data) },
      { status: response.status },
    );
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, no-store",
    },
  });
}

function readOpenAIError(data: unknown) {
  if (
    isRecord(data) &&
    isRecord(data.error) &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }

  return "Failed to generate listening audio.";
}

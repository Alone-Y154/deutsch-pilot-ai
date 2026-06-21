import { buildRealtimeSpeakingSession } from "@/lib/realtime-speaking-config";

export const runtime = "nodejs";

type RealtimeTokenRequest = {
  mode?: string;
  level?: string;
  taskTitle?: string;
  taskPrompt?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Live voice is unavailable, but transcript feedback demo mode still works.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as RealtimeTokenRequest;

  const sessionConfig = buildRealtimeSpeakingSession({
    mode: body.mode || "pronunciation",
    level: body.level || "A1",
    taskTitle: body.taskTitle || "German speaking practice",
    taskPrompt: body.taskPrompt || "Speak naturally in German.",
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime",
    voice: process.env.OPENAI_REALTIME_VOICE || "marin",
    transcriptionModel:
      process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
  });

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionConfig),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    return Response.json(
      { error: getOpenAIErrorMessage(data), details: data },
      { status: response.status },
    );
  }

  const clientSecret = extractClientSecret(data);

  if (!clientSecret) {
    return Response.json(
      { error: "Realtime token response did not include a client secret.", details: data },
      { status: 502 },
    );
  }

  return Response.json({
    clientSecret,
    session: data,
  });
}

function extractClientSecret(data: unknown) {
  if (!isRecord(data)) {
    return null;
  }

  if (typeof data.value === "string") {
    return data.value;
  }

  if (isRecord(data.client_secret) && typeof data.client_secret.value === "string") {
    return data.client_secret.value;
  }

  if (isRecord(data.clientSecret) && typeof data.clientSecret.value === "string") {
    return data.clientSecret.value;
  }

  return null;
}

function getOpenAIErrorMessage(data: unknown) {
  if (
    isRecord(data) &&
    isRecord(data.error) &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }

  return "Failed to create realtime token.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

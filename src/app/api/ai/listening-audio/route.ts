import {
  listeningAudioScriptSegmentSchema,
  listeningFormatSchema,
} from "@/lib/ai/listening-schemas";
import { isRecord } from "@/lib/ai/response-utils";
import {
  assignVoicesToScript,
  isLikelyGerman,
} from "@/lib/listening-format";

export const runtime = "nodejs";

const maxListeningCharacters = 8_000;
const speechUrl = "https://api.openai.com/v1/audio/speech";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is required for generated listening audio." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    audioScript?: unknown;
    level?: unknown;
    format?: unknown;
  } | null;
  const scriptResult = listeningAudioScriptSegmentSchema
    .array()
    .min(1)
    .max(16)
    .safeParse(body?.audioScript);
  const formatResult = listeningFormatSchema.safeParse(body?.format);

  if (!scriptResult.success || !formatResult.success) {
    return Response.json(
      { error: "A valid format-aware German audio script is required." },
      { status: 400 },
    );
  }

  const totalCharacters = scriptResult.data.reduce(
    (total, segment) => total + segment.text.length,
    0,
  );
  if (totalCharacters > maxListeningCharacters) {
    return Response.json(
      { error: "Listening text is too long for one audio exercise." },
      { status: 413 },
    );
  }

  if (scriptResult.data.some((segment) => !isLikelyGerman(segment.text))) {
    return Response.json(
      { error: "Listening audio can only be generated from German script text." },
      { status: 400 },
    );
  }

  const level = typeof body?.level === "string" ? body.level : "B1";
  const voicedScript = assignVoicesToScript(scriptResult.data);

  try {
    const clips = await mapWithConcurrency(voicedScript, 3, async (segment) => {
      const response = await fetch(speechUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
          voice: segment.voice,
          input: segment.text,
          instructions: deliveryInstructions({
            level,
            format: formatResult.data,
            speaker: segment.speaker,
            role: segment.role,
          }),
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        throw new Error(readOpenAIError(data));
      }

      return {
        speaker: segment.speaker,
        role: segment.role,
        voice: segment.voice,
        text: segment.text,
        mimeType: "audio/mpeg",
        audioBase64: Buffer.from(await response.arrayBuffer()).toString("base64"),
      };
    });

    return Response.json(
      {
        clips,
        speakerCount: new Set(clips.map((clip) => clip.speaker)).size,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate listening audio.",
      },
      { status: 502 },
    );
  }
}

function deliveryInstructions({
  level,
  format,
  speaker,
  role,
}: {
  level: string;
  format: "dialogue" | "announcement" | "interview" | "story" | "news";
  speaker: string;
  role: string;
}) {
  const formatStyle = {
    dialogue:
      "Sound conversational and spontaneous. React naturally to the previous speaker without sounding like narration.",
    announcement:
      "Sound like a clear German public-address announcement. Use controlled pacing, practical emphasis, and a short pause around critical details.",
    interview:
      "Sound like a natural interview participant. Questions should be curious; answers should be thoughtful and conversational.",
    story:
      "Sound like an engaging German storyteller with natural phrasing and restrained emotion.",
    news:
      "Sound like a professional German news broadcast with precise diction and calm authority.",
  }[format];

  return [
    `Speak only the exact German input for a ${level} listening learner.`,
    `You are ${speaker}, whose role is ${role}.`,
    formatStyle,
    "Do not translate, explain, announce the speaker name, or add any words.",
  ].join(" ");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker(),
    ),
  );
  return results;
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

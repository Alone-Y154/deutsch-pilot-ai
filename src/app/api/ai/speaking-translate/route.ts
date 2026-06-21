import { translateGermanSpeakingTurn } from "@/lib/ai/speaking-translation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const text =
    typeof payload === "object" &&
    payload !== null &&
    "text" in payload &&
    typeof payload.text === "string"
      ? payload.text.trim()
      : "";

  if (!text) {
    return Response.json(
      { error: "German transcript text is required." },
      { status: 400 },
    );
  }

  if (text.length > 5000) {
    return Response.json(
      { error: "A transcript turn must be 5,000 characters or shorter." },
      { status: 413 },
    );
  }

  try {
    return Response.json(await translateGermanSpeakingTurn(text));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Transcript translation failed.",
      },
      { status: 502 },
    );
  }
}

import {
  generateSpeechFeedback,
  type SpeechFeedbackRequest,
} from "@/lib/ai/speech-feedback";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<
    SpeechFeedbackRequest
  > | null;

  if (!body?.transcript?.trim()) {
    return Response.json(
      { error: "A transcript is required before AI correction can run." },
      { status: 400 },
    );
  }

  try {
    const result = await generateSpeechFeedback({
      transcript: body.transcript,
      mode: body.mode || "speaking-practice",
      level: body.level || "A1",
      taskTitle: body.taskTitle || "German speaking task",
      taskPrompt: body.taskPrompt || "Speak in German.",
      target: body.target,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate speech feedback.",
      },
      { status: 500 },
    );
  }
}

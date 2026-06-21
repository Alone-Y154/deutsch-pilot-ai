import {
  generateConversationTurn,
  type ConversationTurnRequest,
} from "@/lib/ai/lesson-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<
    ConversationTurnRequest
  > | null;

  if (!body?.scenario || !body.learnerMessage?.trim()) {
    return Response.json(
      { error: "A scenario and learner message are required." },
      { status: 400 },
    );
  }

  try {
    const result = await generateConversationTurn({
      level: body.level || body.scenario.level || "A1",
      scenario: body.scenario,
      history: Array.isArray(body.history) ? body.history : [],
      learnerMessage: body.learnerMessage,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to continue conversation.",
      },
      { status: 500 },
    );
  }
}

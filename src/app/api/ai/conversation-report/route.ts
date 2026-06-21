import {
  generateConversationReport,
  type ConversationReportRequest,
} from "@/lib/ai/lesson-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<
    ConversationReportRequest
  > | null;

  if (!body?.scenario || !Array.isArray(body.history) || body.history.length < 2) {
    return Response.json(
      { error: "A scenario and conversation history are required." },
      { status: 400 },
    );
  }

  try {
    const result = await generateConversationReport({
      level: body.level || body.scenario.level || "A1",
      scenario: body.scenario,
      history: body.history,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate report.",
      },
      { status: 500 },
    );
  }
}

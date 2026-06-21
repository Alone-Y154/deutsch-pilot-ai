import { generateLesson, type LessonGenerateRequest } from "@/lib/ai/lesson-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<
    LessonGenerateRequest
  >;

  try {
    const result = await generateLesson({
      level: body.level || "A1",
      topic: body.topic || "Introductions",
      goal: body.goal,
      weakTags: Array.isArray(body.weakTags) ? body.weakTags : [],
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate lesson.",
      },
      { status: 500 },
    );
  }
}

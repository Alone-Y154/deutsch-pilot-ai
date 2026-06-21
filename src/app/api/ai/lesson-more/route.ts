import { generateLessonMore, type LessonMoreRequest } from "@/lib/ai/lesson-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<
    LessonMoreRequest
  >;

  if (!body.level || !body.currentLessonTitle || !body.userRequest?.trim()) {
    return Response.json(
      { error: "Level, lesson title, and learner request are required." },
      { status: 400 },
    );
  }

  try {
    const result = await generateLessonMore({
      level: body.level,
      currentLessonTitle: body.currentLessonTitle,
      currentGoal: body.currentGoal || "",
      userRequest: body.userRequest,
      existingWeakTags: Array.isArray(body.existingWeakTags)
        ? body.existingWeakTags
        : [],
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate more lesson content.",
      },
      { status: 500 },
    );
  }
}

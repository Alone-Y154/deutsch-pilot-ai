import {
  generateCurriculumMap,
  type CurriculumMapRequest,
} from "@/lib/ai/lesson-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<
    CurriculumMapRequest
  >;

  if (!body.level || !body.title || !body.focus) {
    return Response.json(
      { error: "Level, title, and focus are required." },
      { status: 400 },
    );
  }

  try {
    const result = await generateCurriculumMap({
      level: body.level,
      title: body.title,
      focus: body.focus,
      requestedFocus: body.requestedFocus,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate curriculum map.",
      },
      { status: 500 },
    );
  }
}

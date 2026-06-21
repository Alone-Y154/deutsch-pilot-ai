import {
  generateListeningExercise,
  type ListeningExerciseRequest,
} from "@/lib/ai/listening-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<
    ListeningExerciseRequest
  >;

  try {
    return Response.json(
      await generateListeningExercise({
        level: body.level || "B1",
        topic: body.topic || "daily life",
        format: body.format || "dialogue",
        questionCount:
          typeof body.questionCount === "number" ? body.questionCount : 5,
      }),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate listening exercise.",
      },
      { status: 500 },
    );
  }
}

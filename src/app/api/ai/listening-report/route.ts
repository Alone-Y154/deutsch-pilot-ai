import { generateListeningReport } from "@/lib/ai/listening-ai";
import { listeningExerciseSchema } from "@/lib/ai/listening-schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    exercise?: unknown;
    answers?: unknown;
  } | null;
  const exercise = listeningExerciseSchema.safeParse(body?.exercise);
  const answers = isStringRecord(body?.answers) ? body.answers : null;

  if (!exercise.success || !answers) {
    return Response.json(
      { error: "A valid listening exercise and answers are required." },
      { status: 400 },
    );
  }

  const missingAnswer = exercise.data.questions.some(
    (question) => !answers[question.id],
  );

  if (missingAnswer) {
    return Response.json(
      { error: "Answer every listening question before generating the report." },
      { status: 400 },
    );
  }

  try {
    return Response.json(
      await generateListeningReport({
        exercise: exercise.data,
        answers,
      }),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate listening report.",
      },
      { status: 500 },
    );
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === "string");
}

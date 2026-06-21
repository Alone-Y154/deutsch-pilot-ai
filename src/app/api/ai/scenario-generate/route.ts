import {
  generateScenario,
  type ScenarioGenerateRequest,
} from "@/lib/ai/lesson-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<
    ScenarioGenerateRequest
  >;

  try {
    const result = await generateScenario({
      level: body.level || "A1",
      topic: body.topic || "Daily life",
      existingTitles: Array.isArray(body.existingTitles) ? body.existingTitles : [],
      weakTags: Array.isArray(body.weakTags) ? body.weakTags : [],
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate scenario.",
      },
      { status: 500 },
    );
  }
}

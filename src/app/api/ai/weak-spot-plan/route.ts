import { generateWeakSpotPlan } from "@/lib/ai/workspace-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<{
    level: string;
    weakArea: string;
    context: string;
  }>;

  if (!body.weakArea?.trim()) {
    return Response.json({ error: "Weak area is required." }, { status: 400 });
  }

  try {
    return Response.json(
      await generateWeakSpotPlan({
        level: body.level || "A2",
        weakArea: body.weakArea,
        context: body.context || "",
      }),
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate weak spot plan." },
      { status: 500 },
    );
  }
}

import { generateDiagnosticPlan } from "@/lib/ai/workspace-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<{
    goal: string;
    experience: string;
    selfAssessment: string;
  }>;

  try {
    return Response.json(
      await generateDiagnosticPlan({
        goal: body.goal || "Learn German for everyday use",
        experience: body.experience || "",
        selfAssessment: body.selfAssessment || "",
      }),
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate diagnostic." },
      { status: 500 },
    );
  }
}

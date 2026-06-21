import { generateExamPractice } from "@/lib/ai/workspace-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<{
    level: string;
    examType: string;
    focus: string;
  }>;

  try {
    return Response.json(
      await generateExamPractice({
        level: body.level || "A2",
        examType: body.examType || "Goethe-style",
        focus: body.focus || "speaking and writing",
      }),
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate exam practice." },
      { status: 500 },
    );
  }
}

import {
  analyzeInterviewProfile,
  type InterviewSetupInput,
} from "@/lib/ai/interview-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<InterviewSetupInput>;

  if (!body.jobDescription?.trim() || !body.resume?.trim()) {
    return Response.json(
      { error: "Paste both a job description and resume before analysis." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeInterviewProfile({
      jobDescription: body.jobDescription,
      resume: body.resume,
      targetLevel: body.targetLevel || "B1",
      interviewType: body.interviewType || "mixed HR + behavioral + role-specific",
      questionCount: normalizeQuestionCount(body.questionCount),
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze interview materials.",
      },
      { status: 500 },
    );
  }
}

function normalizeQuestionCount(count: unknown) {
  return typeof count === "number" ? Math.max(3, Math.min(count, 12)) : 8;
}

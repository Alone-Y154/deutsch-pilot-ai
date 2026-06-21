import {
  generateInterviewQuestions,
  type InterviewQuestionsInput,
} from "@/lib/ai/interview-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<
    InterviewQuestionsInput
  >;

  if (!body.analysis || !body.jobDescription?.trim() || !body.resume?.trim()) {
    return Response.json(
      { error: "Profile analysis, job description, and resume are required." },
      { status: 400 },
    );
  }

  try {
    const result = await generateInterviewQuestions({
      jobDescription: body.jobDescription,
      resume: body.resume,
      targetLevel: body.targetLevel || body.analysis.targetLevel || "B1",
      interviewType: body.interviewType || "mixed HR + behavioral + role-specific",
      questionCount: normalizeQuestionCount(body.questionCount),
      analysis: body.analysis,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate interview questions.",
      },
      { status: 500 },
    );
  }
}

function normalizeQuestionCount(count: unknown) {
  return typeof count === "number" ? Math.max(3, Math.min(count, 12)) : 8;
}

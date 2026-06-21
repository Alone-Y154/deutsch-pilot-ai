import {
  generateInterviewAnswerFeedback,
  type InterviewAnswerFeedbackInput,
} from "@/lib/ai/interview-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<
    InterviewAnswerFeedbackInput
  >;

  if (!body.question || !body.analysis || !body.transcript?.trim()) {
    return Response.json(
      { error: "Question, analysis, and spoken answer transcript are required." },
      { status: 400 },
    );
  }

  try {
    const result = await generateInterviewAnswerFeedback({
      jobDescription: body.jobDescription || "",
      resume: body.resume || "",
      targetLevel: body.targetLevel || body.analysis.targetLevel || "B1",
      interviewType: body.interviewType || "mixed HR + behavioral + role-specific",
      questionCount: normalizeQuestionCount(body.questionCount),
      analysis: body.analysis,
      question: body.question,
      transcript: body.transcript,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to score interview answer.",
      },
      { status: 500 },
    );
  }
}

function normalizeQuestionCount(count: unknown) {
  return typeof count === "number" ? Math.max(3, Math.min(count, 12)) : 8;
}

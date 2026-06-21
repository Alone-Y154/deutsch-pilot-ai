import {
  generateInterviewFinalReport,
  type InterviewFinalReportInput,
} from "@/lib/ai/interview-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<
    InterviewFinalReportInput
  >;

  if (!body.analysis || !body.questionSet || !Array.isArray(body.answers)) {
    return Response.json(
      { error: "Analysis, question set, and answers are required." },
      { status: 400 },
    );
  }

  if (body.answers.length === 0) {
    return Response.json(
      { error: "Answer at least one interview question before generating a report." },
      { status: 400 },
    );
  }

  try {
    const result = await generateInterviewFinalReport({
      jobDescription: body.jobDescription || "",
      resume: body.resume || "",
      targetLevel: body.targetLevel || body.analysis.targetLevel || "B1",
      interviewType: body.interviewType || "mixed HR + behavioral + role-specific",
      questionCount: normalizeQuestionCount(body.questionCount),
      analysis: body.analysis,
      questionSet: body.questionSet,
      answers: body.answers,
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate interview report.",
      },
      { status: 500 },
    );
  }
}

function normalizeQuestionCount(count: unknown) {
  return typeof count === "number" ? Math.max(3, Math.min(count, 12)) : 8;
}

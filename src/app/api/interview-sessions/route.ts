import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return Response.json({
      stored: false,
      reason: "Supabase is not configured. Interview session kept in browser only.",
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({
      stored: false,
      reason: "User is not signed in. Interview session kept in browser only.",
    });
  }

  if (!isRecord(payload)) {
    return Response.json(
      { stored: false, reason: "Invalid interview session payload." },
      { status: 400 },
    );
  }

  const analysis = isRecord(payload.analysis) ? payload.analysis : {};
  const questionSet = isRecord(payload.questionSet) ? payload.questionSet : {};
  const report = isRecord(payload.report) ? payload.report : {};
  const questions = Array.isArray(questionSet.questions) ? questionSet.questions : [];
  const answers = Array.isArray(payload.answers) ? payload.answers : [];

  const { data: session, error: sessionError } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: user.id,
      status: readString(payload.status) || "completed",
      target_level: readString(payload.targetLevel),
      interview_type: readString(payload.interviewType),
      question_count:
        typeof payload.questionCount === "number" ? payload.questionCount : questions.length,
      question_mode: readString(payload.questionMode),
      job_description: readString(payload.jobDescription),
      resume_text: readString(payload.resume),
      analysis,
      question_set: questionSet,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return Response.json(
      { stored: false, reason: sessionError?.message || "Session insert failed." },
      { status: 500 },
    );
  }

  const sessionId = session.id as string;

  if (questions.length > 0) {
    const { error } = await supabase.from("interview_questions").insert(
      questions
        .filter(isRecord)
        .map((question, index) => ({
          user_id: user.id,
          session_id: sessionId,
          question_id: readString(question.id) || `q-${index + 1}`,
          category: readString(question.category),
          difficulty: readString(question.difficulty),
          question_german: readString(question.questionGerman),
          question_english: readString(question.questionEnglish),
          payload: question,
          position: index + 1,
        })),
    );

    if (error) {
      return Response.json({ stored: false, reason: error.message }, { status: 500 });
    }
  }

  if (answers.length > 0) {
    const { error } = await supabase.from("interview_answers").insert(
      answers.filter(isRecord).map((answer) => {
        const question = isRecord(answer.question) ? answer.question : {};
        const feedback = isRecord(answer.feedback) ? answer.feedback : {};
        const language = isRecord(feedback.language) ? feedback.language : {};
        const interview = isRecord(feedback.interview) ? feedback.interview : {};

        return {
          user_id: user.id,
          session_id: sessionId,
          question_id: readString(question.id),
          transcript: readString(answer.transcript),
          feedback,
          grammar_score: readNumber(language.grammarScore),
          vocabulary_score: readNumber(language.vocabularyScore),
          fluency_score: readNumber(language.fluencyScore),
          role_fit_score: readNumber(interview.roleFitScore),
          answer_structure_score: readNumber(interview.answerStructureScore),
          confidence_score: readNumber(interview.confidenceScore),
          weak_tags: Array.isArray(feedback.weakTags)
            ? feedback.weakTags.filter((tag) => typeof tag === "string")
            : [],
        };
      }),
    );

    if (error) {
      return Response.json({ stored: false, reason: error.message }, { status: 500 });
    }
  }

  const languageScores = isRecord(report.languageScores) ? report.languageScores : {};
  const interviewScores = isRecord(report.interviewScores) ? report.interviewScores : {};

  const { error: reportError } = await supabase.from("interview_reports").insert({
    user_id: user.id,
    session_id: sessionId,
    report,
    overall_readiness_score: readNumber(report.overallReadinessScore),
    estimated_speaking_level: readString(report.estimatedSpeakingLevel),
    grammar_score: readNumber(languageScores.grammar),
    vocabulary_score: readNumber(languageScores.vocabulary),
    fluency_score: readNumber(languageScores.fluency),
    role_fit_score: readNumber(interviewScores.roleFit),
    answer_structure_score: readNumber(interviewScores.answerStructure),
    confidence_score: readNumber(interviewScores.confidence),
  });

  if (reportError) {
    return Response.json({ stored: false, reason: reportError.message }, { status: 500 });
  }

  await supabase
    .from("interview_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  return Response.json({ stored: true, sessionId });
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

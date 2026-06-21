import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return Response.json({
      stored: false,
      reason: "Supabase is not configured. Conversation report kept in browser only.",
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({
      stored: false,
      reason: "User is not signed in. Conversation report kept in browser only.",
    });
  }

  if (!isRecord(payload)) {
    return Response.json({ stored: false, reason: "Invalid report payload." }, { status: 400 });
  }

  const scenario = isRecord(payload.scenario) ? payload.scenario : {};
  const report = isRecord(payload.report) ? payload.report : {};
  const history = Array.isArray(payload.history) ? payload.history : [];

  const { error } = await supabase.from("conversation_reports").insert({
    user_id: user.id,
    level: readString(payload.level),
    scenario_title: readString(scenario.title),
    scenario_payload: scenario,
    conversation_history: history,
    report,
    weak_tags:
      Array.isArray(report.weakTags)
        ? report.weakTags.filter((tag) => typeof tag === "string")
        : [],
    fluency_score:
      typeof report.fluencyScore === "number" ? report.fluencyScore : null,
    grammar_score:
      typeof report.grammarScore === "number" ? report.grammarScore : null,
    vocabulary_score:
      typeof report.vocabularyScore === "number" ? report.vocabularyScore : null,
    task_completion_score:
      typeof report.taskCompletionScore === "number"
        ? report.taskCompletionScore
        : null,
  });

  if (error) {
    return Response.json({ stored: false, reason: error.message }, { status: 500 });
  }

  return Response.json({ stored: true });
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

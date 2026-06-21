import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return Response.json({
      stored: false,
      reason: "Supabase is not configured. Attempt kept in the browser session only.",
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({
      stored: false,
      reason: "User is not signed in. Attempt kept in the browser session only.",
    });
  }

  if (!isRecord(payload)) {
    return Response.json({ stored: false, reason: "Invalid attempt payload." }, { status: 400 });
  }

  const feedback = isRecord(payload.feedback) ? payload.feedback : null;
  const mode = readString(payload.mode);
  const level = readString(payload.level);
  const taskTitle = readString(payload.taskTitle);
  const taskPrompt = readString(payload.taskPrompt);
  const transcript = readString(payload.transcript).trim();
  const transcriptTurns = sanitizeTranscriptTurns(payload.transcriptTurns);
  const analysisBasis = readString(payload.analysisBasis);

  if (!mode || !level || !taskTitle || !taskPrompt || !transcript || !feedback) {
    return Response.json(
      { stored: false, reason: "Speaking attempt data is incomplete." },
      { status: 400 },
    );
  }

  const fluencyScore =
    feedback && typeof feedback.fluencyScore === "number" ? feedback.fluencyScore : null;
  const taskCompletionScore =
    feedback && typeof feedback.taskCompletionScore === "number"
      ? feedback.taskCompletionScore
      : null;

  const weakTags = Array.isArray(feedback.weakTags)
    ? feedback.weakTags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const { data: attempt, error } = await supabase
    .from("speaking_attempts")
    .insert({
      user_id: user.id,
      mode,
      level,
      task_title: taskTitle,
      task_prompt: taskPrompt,
      transcript,
      corrected_german:
        typeof feedback.correctedGerman === "string"
          ? feedback.correctedGerman
          : null,
      feedback: {
        ...feedback,
        transcriptTurns,
        analysisBasis:
          analysisBasis === "audio" || analysisBasis === "transcript"
            ? analysisBasis
            : undefined,
      },
      fluency_score: fluencyScore,
      task_completion_score: taskCompletionScore,
      weak_tags: weakTags,
    })
    .select("id")
    .single();

  if (error || !attempt) {
    return Response.json(
      { stored: false, reason: error?.message || "Attempt insert failed." },
      { status: 500 },
    );
  }

  const writes: Array<PromiseLike<{ error: { message?: string } | null }>> = [];

  if (typeof fluencyScore === "number") {
    writes.push(
      supabase.from("skill_scores").insert({
        user_id: user.id,
        skill: "Speaking",
        score: clampScore(fluencyScore),
        cefr_level:
          typeof feedback.cefrLevel === "string" ? feedback.cefrLevel : level,
        updated_at: new Date().toISOString(),
      }),
    );
  }

  if (weakTags.length) {
    writes.push(
      supabase.from("weakness_events").insert(
        weakTags.map((weakTag) => ({
          user_id: user.id,
          source_type: "speaking",
          source_id: attempt.id,
          weak_tag: weakTag,
          severity:
            typeof fluencyScore === "number" && fluencyScore < 50 ? 3 : 2,
          status: "active",
        })),
      ),
    );
  }

  const relatedResults = await Promise.all(writes);
  const warnings = relatedResults
    .map((result) => result.error?.message)
    .filter((message): message is string => Boolean(message));

  return Response.json({
    stored: true,
    attemptId: attempt.id,
    warnings,
  });
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeTranscriptTurns(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 40).flatMap((turn) => {
    if (!isRecord(turn)) return [];
    const role = readString(turn.role);
    const german = readString(turn.german).slice(0, 5000);
    const english = readString(turn.english).slice(0, 5000);

    if ((role !== "user" && role !== "assistant") || !german) {
      return [];
    }

    return [{ role, german, english }];
  });
}

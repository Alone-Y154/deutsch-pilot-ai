import {
  listeningExerciseSchema,
  listeningReportSchema,
} from "@/lib/ai/listening-schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const exercise = listeningExerciseSchema.safeParse(
    isRecord(payload) ? payload.exercise : null,
  );

  if (!exercise.success) {
    return Response.json(
      { stored: false, reason: "Invalid listening exercise." },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedClient();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("ai_reports")
    .insert({
      user_id: auth.userId,
      report_type: "listening_session",
      payload: {
        status: "generated",
        exercise: exercise.data,
        source: readString(isRecord(payload) ? payload.source : ""),
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    return Response.json(
      { stored: false, reason: error?.message || "Listening session insert failed." },
      { status: 500 },
    );
  }

  return Response.json({ stored: true, sessionId: data.id });
}

export async function PATCH(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!isRecord(payload)) {
    return Response.json(
      { stored: false, reason: "Invalid listening session payload." },
      { status: 400 },
    );
  }

  const sessionId = readString(payload.sessionId);
  const exercise = listeningExerciseSchema.safeParse(payload.exercise);
  const report = listeningReportSchema.safeParse(payload.report);
  const answers = isStringRecord(payload.answers) ? payload.answers : null;

  if (!sessionId || !exercise.success || !report.success || !answers) {
    return Response.json(
      { stored: false, reason: "Completed listening data is invalid." },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedClient();
  if ("response" in auth) return auth.response;

  const { error } = await auth.supabase
    .from("ai_reports")
    .update({
      payload: {
        status: "completed",
        exercise: exercise.data,
        answers,
        report: report.data,
        source: readString(payload.source),
        completedAt: new Date().toISOString(),
      },
    })
    .eq("id", sessionId)
    .eq("user_id", auth.userId)
    .eq("report_type", "listening_session");

  if (error) {
    return Response.json({ stored: false, reason: error.message }, { status: 500 });
  }

  const weakTags = report.data.weakTags.filter(Boolean).slice(0, 12);

  const relatedResults = await Promise.all([
    auth.supabase.from("skill_scores").insert({
      user_id: auth.userId,
      skill: "Listening",
      score: report.data.score,
      cefr_level: report.data.estimatedLevel,
      updated_at: new Date().toISOString(),
    }),
    weakTags.length
      ? auth.supabase.from("weakness_events").insert(
          weakTags.map((weakTag) => ({
            user_id: auth.userId,
            source_type: "listening",
            source_id: sessionId,
            weak_tag: weakTag,
            severity: report.data.score < 50 ? 3 : 2,
            status: "active",
          })),
        )
      : Promise.resolve({ error: null }),
  ]);
  const warnings = relatedResults
    .map((result) => result.error?.message)
    .filter((message): message is string => Boolean(message));

  return Response.json({ stored: true, sessionId, warnings });
}

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      response: Response.json(
        { stored: false, reason: "Supabase is not configured." },
        { status: 503 },
      ),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: Response.json(
        { stored: false, reason: "Login is required." },
        { status: 401 },
      ),
    };
  }

  return { supabase, userId: user.id };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

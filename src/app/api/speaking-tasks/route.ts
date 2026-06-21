import { generateSpeakingTask } from "@/lib/ai/speaking-tasks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createCustomSpeakingTask,
  speakingPracticeTaskSchema,
} from "@/lib/speaking-task-model";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getAuthenticatedClient();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("ai_reports")
    .select("id, payload, created_at")
    .eq("user_id", auth.userId)
    .eq("report_type", "speaking_task")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const tasks = (data || []).flatMap((row) => {
    const payload = isRecord(row.payload) ? row.payload : {};
    const parsed = speakingPracticeTaskSchema.safeParse(payload.task);
    return parsed.success ? [parsed.data] : [];
  });

  return Response.json({ tasks });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!isRecord(payload)) {
    return Response.json({ error: "Invalid speaking task payload." }, { status: 400 });
  }

  const auth = await getAuthenticatedClient();
  if ("response" in auth) return auth.response;

  try {
    const action = readString(payload.action);
    const result =
      action === "custom"
        ? {
            task: createCustomSpeakingTask({
              mode: readString(payload.mode),
              level: readString(payload.level),
              title: readString(payload.title),
              text: readString(payload.text),
            }),
            generationSource: "custom",
          }
        : {
            ...(await generateSpeakingTask({
              mode: readString(payload.mode),
              level: readString(payload.level),
              existingTitles: Array.isArray(payload.existingTitles)
                ? payload.existingTitles.filter(
                    (title): title is string => typeof title === "string",
                  )
                : [],
            })),
            generationSource: "generated",
          };
    const task = speakingPracticeTaskSchema.parse(result.task);

    const { error } = await auth.supabase.from("ai_reports").insert({
      user_id: auth.userId,
      report_type: "speaking_task",
      payload: {
        task,
        generationSource:
          "source" in result ? result.source : result.generationSource,
      },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ task, stored: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Speaking task creation failed.",
      },
      { status: 400 },
    );
  }
}

async function getAuthenticatedClient() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      response: Response.json(
        { error: "Supabase is not configured." },
        { status: 503 },
      ),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: Response.json({ error: "Login is required." }, { status: 401 }),
    };
  }

  return { supabase, userId: user.id };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

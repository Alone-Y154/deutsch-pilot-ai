import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const confirmation =
    typeof payload === "object" &&
    payload !== null &&
    "confirmation" in payload &&
    typeof payload.confirmation === "string"
      ? payload.confirmation.trim()
      : "";

  if (confirmation !== "sure") {
    return Response.json(
      { error: 'Type "sure" to deactivate your account.' },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await supabase.auth.signOut();

  return Response.json({ deactivated: true });
}

import { getAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required." }, { status: 503 });
  }

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const ids = data.users.map((user) => user.id);
  const { data: profiles } = ids.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, target_level, goal, is_active, created_at, deactivated_at")
        .in("id", ids)
    : { data: [] };
  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return Response.json({
    users: data.users.map((user) => ({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      profile: profileMap.get(user.id) || null,
    })),
  });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required." }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  if (!isRecord(payload)) {
    return Response.json({ error: "Invalid user payload." }, { status: 400 });
  }

  const email = readString(payload.email).toLowerCase();
  const password = readString(payload.password);
  const displayName = readString(payload.displayName) || email.split("@")[0];

  if (!email || password.length < 6) {
    return Response.json(
      { error: "Email and a 6+ character password are required." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: displayName },
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      display_name: displayName,
      is_active: true,
    });
  }

  return Response.json({ created: true, userId: data.user?.id });
}

export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "userId is required." }, { status: 400 });
  }

  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  if (userData.user?.email === process.env.ADMIN_EMAIL) {
    return Response.json({ error: "Admin account cannot be deleted here." }, { status: 400 });
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ deleted: true });
}

async function requireAdmin() {
  const session = await getAdminSession();

  if (!session) {
    return Response.json({ error: "Admin login required." }, { status: 401 });
  }

  return null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

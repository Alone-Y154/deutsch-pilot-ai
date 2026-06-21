import { betaUserLimit } from "@/lib/beta";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!isRecord(payload)) {
    return Response.json({ error: "Invalid signup request." }, { status: 400 });
  }

  const email = readString(payload.email).toLowerCase();
  const password = readString(payload.password);
  const displayName = readString(payload.displayName);

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ error: "Use at least 6 password characters." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return Response.json(
      { error: "Signup requires SUPABASE_SERVICE_ROLE_KEY for beta seat enforcement." },
      { status: 503 },
    );
  }

  let count: number | null = null;
  try {
    const resp = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    count = resp.data.users.length;
    const countError = resp.error;
    if (countError) {
      return Response.json(
        { error: `Could not verify beta capacity: ${countError.message}` },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[signup] profiles count threw:", err);
    return Response.json(
      { error: "Could not verify beta capacity." },
      { status: 500 },
    );
  }

  if (count === null) {
    return Response.json(
      { error: "Could not verify beta capacity." },
      { status: 500 },
    );
  }

  const activeCount = count;

  if (activeCount >= betaUserLimit) {
    const { error } = await supabase.from("beta_waitlist").upsert(
      {
        email,
        display_name: displayName || email.split("@")[0],
        source: "beta_threshold",
        status: "waiting",
      },
      { onConflict: "email" },
    );

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      created: false,
      waitlisted: true,
      message: "The free beta is full. You are on the waitlist.",
    });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: displayName || email.split("@")[0],
    },
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      display_name: displayName || email.split("@")[0],
      is_active: true,
    });
  }

  return Response.json({ created: true, waitlisted: false });
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

const protectedPagePrefixes = [
  "/dashboard",
  "/curriculum",
  "/learn",
  "/interview",
  "/train",
  "/exams",
  "/speaking-lab",
  "/listening-lab",
  "/reports",
  "/settings",
  "/onboarding",
];

const protectedApiPrefixes = [
  "/api/ai",
  "/api/speaking-attempts",
  "/api/listening-sessions",
  "/api/conversation-reports",
  "/api/interview-sessions",
  "/api/account",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return blockRequest(request, "Supabase is not configured.");
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response = NextResponse.next({ request });
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isProtectedApi(pathname)) {
      return NextResponse.json({ error: "Login is required." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && profile.is_active === false) {
    if (isProtectedApi(pathname)) {
      return NextResponse.json(
        { error: "This account has been deactivated." },
        { status: 403 },
      );
    }

    return NextResponse.redirect(new URL("/account-deactivated", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isProtectedPath(pathname: string) {
  return isProtectedApi(pathname) || protectedPagePrefixes.some((path) => pathname.startsWith(path));
}

function isProtectedApi(pathname: string) {
  return protectedApiPrefixes.some((path) => pathname.startsWith(path));
}

function blockRequest(request: NextRequest, error: string) {
  if (isProtectedApi(request.nextUrl.pathname)) {
    return NextResponse.json({ error }, { status: 503 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

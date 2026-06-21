import { NextResponse } from "next/server";

import {
  adminCookieName,
  createAdminToken,
  isAdminConfigured,
  validateAdminCredentials,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!isRecord(payload)) {
    return Response.json({ error: "Invalid admin login request." }, { status: 400 });
  }

  if (!isAdminConfigured()) {
    return Response.json({ error: "Admin env vars are not configured." }, { status: 503 });
  }

  const email = readString(payload.email);
  const password = readString(payload.password);

  if (!validateAdminCredentials(email, password)) {
    return Response.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookieName, createAdminToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

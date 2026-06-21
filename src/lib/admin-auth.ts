import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const adminCookieName = "deutschpilot_admin";

export function getAdminConfig() {
  return {
    email: process.env.ADMIN_EMAIL || "",
    password: process.env.ADMIN_PASSWORD || "",
    secret:
      process.env.ADMIN_SESSION_SECRET ||
      process.env.ADMIN_PASSWORD ||
      "deutschpilot-local-admin-secret",
  };
}

export function isAdminConfigured() {
  const config = getAdminConfig();
  return Boolean(config.email && config.password);
}

export function validateAdminCredentials(email: string, password: string) {
  const config = getAdminConfig();
  return safeEqual(email, config.email) && safeEqual(password, config.password);
}

export function createAdminToken(email: string) {
  const config = getAdminConfig();
  const signature = createHmac("sha256", config.secret).update(email).digest("hex");
  return `${Buffer.from(email).toString("base64url")}.${signature}`;
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName)?.value;

  if (!token) {
    return null;
  }

  const [encodedEmail, signature] = token.split(".");
  const email = Buffer.from(encodedEmail || "", "base64url").toString("utf8");

  if (!email || !signature) {
    return null;
  }

  const expected = createAdminToken(email).split(".")[1];

  if (!safeEqual(signature, expected)) {
    return null;
  }

  if (!safeEqual(email, getAdminConfig().email)) {
    return null;
  }

  return { email };
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

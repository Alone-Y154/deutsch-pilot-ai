import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  Headphones,
  LogIn,
  LogOut,
  Mic,
  Settings,
  Target,
  UserCircle,
} from "lucide-react";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/curriculum", label: "Curriculum", icon: BookOpen },
  { href: "/learn", label: "Lessons", icon: ClipboardCheck },
  { href: "/interview", label: "Interview Mode", icon: BriefcaseBusiness, featured: true },
  { href: "/train/weak-spots", label: "Weak Spots", icon: Target },
  { href: "/exams", label: "Exams", icon: GraduationCap },
  { href: "/speaking-lab", label: "Speaking Lab", icon: Mic, featured: true },
  { href: "/listening-lab", label: "Listening Lab", icon: Headphones, featured: true },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const displayName =
    readUserName(user?.user_metadata) || user?.email?.split("@")[0] || "Learner";

  return (
    <div className="min-h-screen bg-[#f8faf9] text-neutral-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[264px_1fr]">
        <aside className="border-b border-neutral-200 bg-white lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-neutral-200 px-6 py-5">
              <Link href="/dashboard" className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-700 text-white">
                  <Mic className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-base font-semibold">DeutschPilot</span>
                  <span className="block text-xs font-medium uppercase tracking-wide text-teal-700">
                    AI beta
                  </span>
                </span>
              </Link>
            </div>

            <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:block lg:flex-1 lg:space-y-1 lg:overflow-visible lg:py-4">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950",
                      item.featured &&
                        "bg-teal-50 text-teal-800 hover:bg-teal-100 hover:text-teal-950",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden space-y-3 border-t border-neutral-200 px-5 py-4 lg:block">
              {user ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-start gap-2">
                    <UserCircle className="mt-0.5 h-4 w-4 text-teal-700" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{displayName}</p>
                      <p className="truncate text-xs text-neutral-600">{user.email}</p>
                    </div>
                  </div>
                  <form action="/auth/signout" method="post" className="mt-3">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <LogIn className="h-4 w-4" />
                  Login / Sign up
                </Link>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Launch status
                </p>
                <p className="mt-1 text-sm text-amber-950">
                  Free beta. AI scores are practice feedback, not official certification.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function readUserName(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  return typeof record.name === "string" ? record.name : null;
}

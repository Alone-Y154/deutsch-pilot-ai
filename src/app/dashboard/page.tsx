import {
  ArrowRight,
  BarChart3,
  Brain,
  Clock3,
  Headphones,
  Target,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { ScoreRing } from "@/components/score-ring";
import { SkillBars } from "@/components/skill-bars";
import { DashboardCoachClient } from "@/components/workspace/dashboard-coach-client";
import { curriculumLevels } from "@/lib/curriculum";
import { getDashboardData } from "@/lib/dashboard";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <AppShell>
      <div className="px-8 py-7">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              German AI learning workspace
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal">
              {dashboard.user
                ? `${dashboard.user.displayName}'s German cockpit`
                : "Personal German training, mapped from A1 to C2"}
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-neutral-600">
              {dashboard.user
                ? `${dashboard.user.goal} Target level: ${dashboard.user.targetLevel}.`
                : "Sign in to connect lessons, exams, weak-spot drills, and voice correction to one learner profile."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/listening-lab"
              className="flex items-center gap-2 rounded-md border border-teal-700 bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
            >
              <Headphones className="h-4 w-4" />
              Listening Lab
            </Link>
            <Link
              href="/speaking-lab"
              className="flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Open Speaking Lab
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="mt-7 grid grid-cols-4 gap-4">
          {dashboard.metrics.map((stat) => (
            <MetricCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tone={stat.tone}
              detail={stat.detail}
            />
          ))}
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Curriculum map
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                  Your recommended level path
                </h2>
              </div>
              <Brain className="h-6 w-6 text-teal-700" />
            </div>

            <div className="mt-5 grid gap-3">
              {curriculumLevels.map((item) => (
                <Link
                  key={item.level}
                  href={`/curriculum?level=${item.level}`}
                  className={[
                    "grid grid-cols-[72px_1fr_160px] items-center gap-4 rounded-lg border p-4 transition hover:bg-neutral-50",
                    item.level === dashboard.recommendedLevel.level
                      ? "border-teal-300 bg-teal-50"
                      : "border-neutral-200 bg-white",
                  ].join(" ")}
                >
                  <div className="rounded-md bg-white px-3 py-2 text-center text-lg font-semibold text-teal-800">
                    {item.level}
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">{item.focus}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{item.lessons} lessons</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {item.level === dashboard.recommendedLevel.level
                        ? "Recommended"
                        : item.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <ScoreRing score={dashboard.readinessScore || 0} label="Readiness" />
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                {dashboard.readinessScore === null
                  ? "No saved readiness report yet. Complete a speaking lab attempt or interview report to populate this."
                  : "This score is derived from your saved AI feedback and interview reports."}
              </p>
              <Link
                href="/reports"
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                Open reports
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-rose-700" />
                <p className="text-sm font-semibold">Weak spots queued</p>
              </div>
              <div className="mt-4 space-y-3">
                {dashboard.weakTags.length ? (
                  dashboard.weakTags.map((weakTag) => (
                    <div key={weakTag.tag} className="flex items-start gap-3">
                      <Target className="mt-0.5 h-4 w-4 text-teal-700" />
                      <div>
                        <p className="text-sm font-semibold">{weakTag.tag}</p>
                        <p className="text-xs text-neutral-600">
                          {weakTag.count} signals, severity {weakTag.severity}/5
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-neutral-600">
                    Weak tags will appear after speaking, listening, conversation, or
                    interview feedback is saved.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[420px_1fr]">
          <DashboardCoachClient
            initialGoal={
              dashboard.user
                ? `${dashboard.user.goal}. Target level: ${dashboard.user.targetLevel}`
                : "Start German with speaking, lessons, and weak-spot tracking"
            }
          />

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                  Skill analysis
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                  AI profile snapshot
                </h2>
              </div>
            </div>
            {dashboard.skills.length ? (
              <SkillBars scores={dashboard.skills} />
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-sm leading-6 text-neutral-600">
                No user-specific skill scores yet. Complete a speaking or listening
                attempt, conversation report, or interview report and this panel will
                update from Supabase.
              </div>
            )}
          </div>
        </section>

        <section className="mt-7 rounded-lg border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Recent user activity
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                Saved practice timeline
              </h2>
            </div>
            <BarChart3 className="h-5 w-5 text-teal-700" />
          </div>
          {dashboard.recentActivity.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {dashboard.recentActivity.map((activity) => (
                <Link
                  key={`${activity.title}-${activity.createdAt}`}
                  href={activity.href}
                  className="flex items-start gap-3 rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
                >
                  <Clock3 className="mt-0.5 h-4 w-4 text-teal-700" />
                  <div>
                    <p className="text-sm font-semibold">{activity.title}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">
                      {activity.detail}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-sm leading-6 text-neutral-600">
              No saved activity yet. Start with Speaking Lab, Listening Lab, Lessons, or
              Interview Mode after signing in.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

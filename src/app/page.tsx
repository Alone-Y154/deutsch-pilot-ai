import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Code2,
  Network,
  LockKeyhole,
  Mic,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { getBetaStatus } from "@/lib/beta";

const roadmap = [
  {
    title: "Diagnose",
    detail: "AI places the learner, finds weak areas, and creates the first path.",
  },
  {
    title: "Speak",
    detail: "Mic-based German practice corrects pronunciation, grammar, fluency, and vocabulary.",
  },
  {
    title: "Train",
    detail: "Lessons, weak-spot drills, exams, and interviews adapt from saved feedback.",
  },
  {
    title: "Prove",
    detail: "Reports show readiness, speaking estimate, role fit, and next actions.",
  },
];

const features = [
  "Realtime AI Speaking Lab",
  "CEFR Listening Lab with MCQs",
  "A1-C2 AI curriculum maps",
  "German interview mode",
  "Weak-spot training from mistakes",
  "Unofficial Goethe/telc/TestDaF practice",
  "Private Supabase progress tracking",
];

export default async function HomePage() {
  const beta = await getBetaStatus();
  const slotsCopy = beta.waitlistActive ? "Waitlist is open" : "Limited free beta";

  return (
    <main className="min-h-screen bg-[#f8faf9] text-neutral-950">
      <nav className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-700 text-white">
              <Mic className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">DeutschPilot AI</span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-teal-700">
                Free beta
              </span>
            </span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-semibold text-neutral-700 md:flex">
            <a href="#roadmap" className="hover:text-teal-800">
              Roadmap
            </a>
            <a href="#creator" className="hover:text-teal-800">
              Creator
            </a>
            <Link href="/login" className="hover:text-teal-800">
              Login
            </Link>
          </div>
          <Link
            href={beta.waitlistActive ? "/signup?waitlist=1" : "/signup"}
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            {beta.waitlistActive ? "Join waitlist" : "Claim beta seat"}
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-neutral-200 bg-neutral-950 text-white">
        <div className="absolute inset-0 landing-grid opacity-35" />
        <div className="mx-auto grid min-h-[720px] max-w-7xl grid-cols-1 items-center gap-10 px-6 py-20 lg:grid-cols-[1fr_520px]">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-sm font-semibold text-teal-100">
              <BadgeCheck className="h-4 w-4" />
              {slotsCopy}
            </div>
            <h1 className="mt-6 max-w-4xl text-6xl font-semibold leading-tight tracking-normal">
              Learn German with an AI coach that hears you, corrects you, and adapts.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
              DeutschPilot AI maps A1-C2 learning, voice correction, weak-area
              training, exam practice, and German interview preparation into one
              production-grade learner workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={beta.waitlistActive ? "/signup?waitlist=1" : "/signup"}
                className="flex items-center gap-2 rounded-md bg-teal-500 px-5 py-3 text-sm font-semibold text-neutral-950 hover:bg-teal-400"
              >
                {beta.waitlistActive ? "Join the waitlist" : "Start free beta"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Login
                <LockKeyhole className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              <HeroStat label="Beta access" value="Limited" />
              <HeroStat label="Raw audio" value="Not stored" />
              <HeroStat label="Access" value="Login required" />
            </div>
          </div>

          <div className="relative z-10 rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-lg bg-[#f8faf9] p-4 text-neutral-950">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Live speaking review
                  </p>
                  <p className="mt-1 text-lg font-semibold">B1 Interview Answer</p>
                </div>
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-900">
                  AI listening
                </span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <div className="flex h-20 items-end gap-1">
                    {Array.from({ length: 42 }, (_, index) => (
                      <span
                        key={index}
                        className="voice-bar w-full rounded-t bg-teal-700"
                        style={{
                          animationDelay: `${index * 70}ms`,
                          height: `${20 + ((index * 17) % 58)}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InsightCard title="Correction" detail="Ich bin geeignet, weil ich..." />
                  <InsightCard title="Weak tag" detail="Subordinate clauses" />
                  <InsightCard title="Fluency" detail="72% and improving" />
                  <InsightCard title="Retry" detail="Repeat with weil + example" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          <ValueCard
            icon={<Mic className="h-5 w-5" />}
            title="It hears your German"
            detail="Realtime voice sessions and upload fallback turn spoken answers into structured correction."
          />
          <ValueCard
            icon={<Brain className="h-5 w-5" />}
            title="It adapts the path"
            detail="Saved weak tags and reports shape lessons, drills, exams, and interview practice."
          />
          <ValueCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="It respects privacy"
            detail="Transcripts and scores can be saved. Raw audio is not stored by default."
          />
        </div>
      </section>

      <section id="roadmap" className="border-y border-neutral-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                Product roadmap
              </p>
              <h2 className="mt-2 text-4xl font-semibold tracking-normal">
                From first sentence to exam-ready confidence
              </h2>
            </div>
            <Route className="hidden h-8 w-8 text-teal-700 md:block" />
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {roadmap.map((item, index) => (
              <div
                key={item.title}
                className="roadmap-card rounded-lg border border-neutral-200 bg-[#f8faf9] p-5"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-700 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[420px_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            What is included
          </p>
          <h2 className="mt-2 text-4xl font-semibold tracking-normal">
            A full German learning operating system
          </h2>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            The beta is free for the first limited users. Once the 15-seat
            threshold is reached, new learners move to the waitlist.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
              <Sparkles className="h-4 w-4 text-teal-700" />
              <p className="text-sm font-semibold">{feature}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="creator" className="border-t border-neutral-200 bg-neutral-950 px-6 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
              Built by
            </p>
            <h2 className="mt-2 text-4xl font-semibold tracking-normal">
              Yashwanth Krishna
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-300">
              AI Application Engineer and senior front-end engineer focused on
              real-time UX systems, React, TypeScript, and AI-integrated product
              experiences.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://www.linkedin.com/in/yashwanth-krishna-390015168/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                <Network className="h-4 w-4" />
                LinkedIn
              </a>
              <a
                href="https://github.com/Alone-Y154"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10"
              >
                <Code2 className="h-4 w-4" />
                GitHub
              </a>
              <Link
                href="/yashwanthkrishna"
                className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-100"
              >
                View profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-5">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-teal-300" />
              <p className="text-sm font-semibold">Beta capacity</p>
            </div>
            <p className="mt-4 text-5xl font-semibold">Limited</p>
            <p className="mt-2 text-sm leading-6 text-neutral-300">
              Free beta access is open only for the first limited learners. When
              capacity is reached, sign-up becomes waitlist-only.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm text-neutral-600">
          <p>DeutschPilot AI beta. Free for the first limited users.</p>
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-teal-700" />
            <span>AI feedback is practice guidance, not official certification.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function InsightCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-1 text-sm font-semibold">{detail}</p>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-teal-800">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{detail}</p>
    </div>
  );
}

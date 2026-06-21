import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Code2,
  ExternalLink,
  GraduationCap,
  Layers3,
  Mail,
  MapPin,
  Network,
  Phone,
  Rocket,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const skills = [
  { name: "React.js", tier: "core" },
  { name: "TypeScript", tier: "core" },
  { name: "Next.js", tier: "core" },
  { name: "WebSockets", tier: "core" },
  { name: "SSE streaming", tier: "core" },
  { name: "TailwindCSS", tier: "core" },
  { name: "React Query", tier: "state" },
  { name: "Redux Toolkit", tier: "state" },
  { name: "Zustand", tier: "state" },
  { name: "Context API", tier: "state" },
  { name: "Jest", tier: "quality" },
  { name: "React Testing Library", tier: "quality" },
  { name: "Node.js", tier: "backend" },
  { name: "Express.js", tier: "backend" },
  { name: "PostgreSQL", tier: "backend" },
  { name: "MongoDB", tier: "backend" },
  { name: "Redis", tier: "backend" },
  { name: "GraphQL", tier: "api" },
  { name: "REST APIs", tier: "api" },
  { name: "Vercel", tier: "infra" },
  { name: "GCP", tier: "infra" },
  { name: "Docker", tier: "infra" },
  { name: "CI/CD", tier: "infra" },
];

const tierColor: Record<string, string> = {
  core:    "border-teal-400/60 bg-teal-950/40 text-teal-200",
  state:   "border-violet-400/50 bg-violet-950/30 text-violet-200",
  quality: "border-emerald-400/50 bg-emerald-950/30 text-emerald-200",
  backend: "border-amber-400/40 bg-amber-950/30 text-amber-200",
  api:     "border-sky-400/40 bg-sky-950/30 text-sky-200",
  infra:   "border-rose-400/40 bg-rose-950/30 text-rose-200",
};

const stats = [
  { value: "4+", label: "Years shipping" },
  { value: "2", label: "Live AI products" },
  { value: "130+", label: "Eng team scale" },
  { value: "10k+", label: "Product pages built" },
];

const productHighlights = [
  {
    title: "Decisra",
    label: "Real-Time AI Decision Platform",
    url: "https://decisra.com",
    color: "from-teal-500/20 to-cyan-500/10",
    accent: "text-teal-400",
    border: "border-teal-500/30",
    points: [
      "Real-time collaborative UI — synchronized participant state & live updates",
      "WebSocket + SSE state pipeline — low-latency across concurrent users",
      "React Flow visual workflow builder — drag-and-drop node graphs",
      "Zero-login ephemeral sessions with minimal UI friction",
    ],
    tags: ["Realtime collaboration", "AI workflows", "React Flow"],
  },
  {
    title: "HealthLens",
    label: "AI Medical Companion",
    url: "https://healthlens.app",
    color: "from-violet-500/20 to-purple-500/10",
    accent: "text-violet-400",
    border: "border-violet-500/30",
    points: [
      "Mobile-first React Native UI — complex lab data into calm, accessible insight",
      "Intuitive report visualization — progressive disclosure, privacy-first local data",
      "Reusable TypeScript component library — strict mode, modular, Jest + RTL tested",
      "Accessibility-first design — clear information hierarchy for non-technical users",
    ],
    tags: ["Accessible medical UX", "Mobile-first", "Component system"],
  },
];

const experience = [
  {
    role: "ReactJS Consultant",
    company: "Vation Digital",
    period: "2024 – Present",
    location: "Bangalore, IN",
    points: [
      "Shipping production React + TypeScript features with full ownership from spec to deploy",
      "Mentoring developers — code reviews, CSS/TypeScript guidance, testing strategies",
      "Partnering with design & backend teams on user-centric, responsive REST-integrated features",
    ],
  },
  {
    role: "System Engineer — React.js (SDE)",
    company: "Tata Consultancy Services",
    period: "2022 – 2024",
    location: "Bangalore, IN",
    points: [
      "Built React component library across 10,000+ product pages; Redux state, REST/GraphQL APIs",
      "Drove Core Web Vitals, a11y, SEO improvements — maintained Jest + RTL tests at enterprise scale",
      "Established frontend standards adopted across 30–130 person teams through mentorship & reviews",
    ],
  },
];

const strengths = [
  { icon: "⚛️", text: "Architects scalable React component systems" },
  { icon: "⚡", text: "Builds real-time UI with WebSockets and SSE" },
  { icon: "🤖", text: "Turns AI features into clear, usable product experiences" },
  { icon: "🎯", text: "Owns features end-to-end — design through production" },
  { icon: "📊", text: "Keeps performance, testing, and maintainability in frame" },
  { icon: "🧑‍🏫", text: "Mentors engineers through clean implementation patterns" },
];

export default function YashwanthKrishnaPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white antialiased">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* grid bg */}
        <div className="absolute inset-0 landing-grid opacity-20" />
        {/* radial glows */}
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-teal-500/8 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-20">
          {/* badge */}
          <div className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-teal-300">
            <span className="anim-pulse-ring h-2 w-2 rounded-full bg-teal-400" />
            Available for senior roles · Bangalore, India
          </div>

          <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_480px]">
            {/* left */}
            <div className="self-center">
              <h1 className="anim-fade-up delay-100 text-5xl font-bold leading-[1.08] tracking-tight lg:text-7xl">
                <span className="block text-white">Kotapati</span>
                <span className="block bg-gradient-to-r from-teal-300 via-cyan-300 to-teal-400 bg-clip-text text-transparent anim-gradient-x">
                  Yashwanth Krishna
                </span>
              </h1>

              <p className="anim-fade-up delay-200 mt-5 text-lg font-semibold leading-relaxed text-teal-100 lg:text-xl">
                Senior Front-End Engineer · React · TypeScript · Real-Time UX Systems
              </p>

              <p className="anim-fade-up delay-300 mt-4 max-w-xl text-base leading-7 text-neutral-400">
                ~4 years building high-quality, scalable web apps with deep focus on UX,
                performance, and maintainability. Built and shipped two live AI products —
                Decisra and HealthLens — with full frontend ownership from concept to production.
              </p>

              {/* contact pills */}
              <div className="anim-fade-up delay-400 mt-7 flex flex-wrap gap-2.5">
                <ContactPill icon={<MapPin className="h-3.5 w-3.5" />} label="Bangalore, India" />
                <ContactPill icon={<Mail className="h-3.5 w-3.5" />} label="yashwanthkris153@gmail.com" />
                <ContactPill icon={<Phone className="h-3.5 w-3.5" />} label="+91 7989443375" />
              </div>

              {/* CTA row */}
              <div className="anim-fade-up delay-500 mt-8 flex flex-wrap gap-3">
                <a
                  href="https://www.linkedin.com/in/yashwanth-krishna-390015168/"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-bold text-neutral-950 transition-all hover:bg-teal-300 hover:shadow-[0_0_24px_rgba(45,212,191,.4)]"
                >
                  <Network className="h-4 w-4" />
                  LinkedIn
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="https://github.com/Alone-Y154"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-bold transition-all hover:border-white/40 hover:bg-white/10"
                >
                  <Code2 className="h-4 w-4" />
                  GitHub
                </a>
                <a
                  href="https://decisra.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-bold transition-all hover:border-teal-400/40 hover:bg-teal-400/5 hover:text-teal-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  decisra.com
                </a>
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-bold transition-all hover:border-white/40 hover:bg-white/10"
                >
                  DeutschPilot AI
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* right — engineering card */}
            <div className="anim-scale-in delay-300 self-center">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-sm">
                {/* glow border effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/20 via-transparent to-violet-500/10" />
                <div className="relative rounded-xl bg-[#0d1117] p-6">
                  {/* header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-teal-400" />
                        <p className="text-xs font-bold uppercase tracking-widest text-teal-400">
                          Engineering signature
                        </p>
                      </div>
                      <h2 className="mt-2 text-2xl font-bold text-white">
                        Real-time AI product UI
                      </h2>
                      <p className="mt-1 text-xs text-neutral-500">
                        Full-stack · production-grade · AI-native
                      </p>
                    </div>
                    <div className="anim-float flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-500/30">
                      <Zap className="h-5 w-5 text-teal-400" />
                    </div>
                  </div>

                  {/* metrics */}
                  <div className="mt-6 space-y-2.5">
                    <SignatureRow icon="⚛️" label="Frontend depth" value="React + TypeScript" delay="delay-400" />
                    <SignatureRow icon="🟢" label="Backend layer"  value="Node.js + Express"  delay="delay-500" />
                    <SignatureRow icon="⚡" label="Realtime"       value="WebSocket · SSE"    delay="delay-600" />
                    <SignatureRow icon="✅" label="Test coverage"  value="Jest · RTL"         delay="delay-700" />
                    <SignatureRow icon="☁️" label="Deployment"     value="Netlify · Vercel · GCP"       delay="delay-800" />
                  </div>

                  {/* footer pill */}
                  <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-teal-500/20 bg-teal-500/10 px-4 py-2.5">
                    <span className="anim-pulse-ring h-2 w-2 rounded-full bg-teal-400" />
                    <p className="text-xs font-semibold text-teal-300">
                      End-to-end ownership — API design to pixel-perfect UI
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/8 bg-white/3">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`anim-fade-up delay-${(i + 1) * 100} flex flex-col items-center py-10`}
            >
              <span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-5xl font-black text-transparent">
                {s.value}
              </span>
              <span className="mt-1.5 text-sm font-semibold text-neutral-400">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <SectionLabel>What I bring</SectionLabel>
        <h2 className="anim-fade-up mt-3 text-4xl font-bold tracking-tight lg:text-5xl">
          Built for product-grade AI
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <ValueCard
            icon={<Rocket className="h-5 w-5" />}
            title="AI Application Engineer"
            detail="Builds product-grade AI features with a strong UX layer, reliable frontend architecture, and clear user outcomes."
            delay="delay-100"
          />
          <ValueCard
            icon={<Layers3 className="h-5 w-5" />}
            title="Component systems"
            detail="Designs reusable React patterns, strict TypeScript models, and interfaces that teams can extend without drift."
            delay="delay-200"
          />
          <ValueCard
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            title="Production ownership"
            detail="Comfortable owning scope, implementation, testing, launch, performance, and maintainability end to end."
            delay="delay-300"
          />
        </div>
      </section>

      {/* ── FLAGSHIP PRODUCTS ── */}
      <section className="border-y border-white/8 bg-white/2 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-6">
            <div>
              <SectionLabel>Flagship products</SectionLabel>
              <h2 className="anim-fade-up mt-3 text-4xl font-bold tracking-tight lg:text-5xl">
                Live AI products,<br className="hidden lg:block" /> real product pressure
              </h2>
            </div>
            <BadgeCheck className="anim-float h-10 w-10 text-teal-400" />
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {productHighlights.map((p, i) => (
              <article
                key={p.title}
                className={`anim-fade-up delay-${(i + 1) * 200} card-lift group relative overflow-hidden rounded-2xl border ${p.border} bg-white/3 p-7`}
              >
                {/* bg gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-60`} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest ${p.accent}`}>
                        {p.label}
                      </p>
                      <h3 className="mt-2 text-4xl font-black">{p.title}</h3>
                    </div>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-1.5 rounded-lg border ${p.border} bg-white/5 px-3 py-1.5 text-xs font-semibold ${p.accent} transition-all hover:bg-white/10`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Live
                    </a>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-sm leading-6 text-neutral-300">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${p.accent.replace("text-", "bg-")}`} />
                        {pt}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {p.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`rounded-full border ${p.border} bg-white/5 px-3 py-1 text-xs font-semibold ${p.accent}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SKILLS ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
          <div className="self-start">
            <SectionLabel>Technical stack</SectionLabel>
            <h2 className="anim-fade-up mt-3 text-4xl font-bold tracking-tight lg:text-5xl">
              Frontend depth,<br />AI fluency
            </h2>
            <p className="anim-fade-up delay-200 mt-4 text-base leading-7 text-neutral-400">
              Strongest where high-quality UI, live system behavior, AI workflows,
              and reliable frontend engineering intersect.
            </p>
            <div className="anim-fade-up delay-300 mt-6 space-y-2 text-xs font-semibold">
              {[
                ["bg-teal-400",   "Core frontend"],
                ["bg-violet-400", "State management"],
                ["bg-emerald-400","Testing & quality"],
                ["bg-amber-400",  "Backend support"],
                ["bg-sky-400",    "APIs"],
                ["bg-rose-400",   "Infrastructure"],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2 text-neutral-400">
                  <span className={`h-2 w-2 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap content-start gap-2.5">
            {skills.map((s, i) => (
              <span
                key={s.name}
                className={`skill-pill anim-fade-up delay-${Math.min((i % 8) * 100, 900)} rounded-full border px-4 py-1.5 text-sm font-semibold ${tierColor[s.tier]}`}
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERIENCE ── */}
      <section className="border-y border-white/8 bg-white/2 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionLabel>Experience</SectionLabel>
          <h2 className="anim-fade-up mt-3 text-4xl font-bold tracking-tight lg:text-5xl">
            Built at scale
          </h2>
          <div className="mt-12 space-y-5">
            {experience.map((item, i) => (
              <article
                key={`${item.role}-${item.company}`}
                className={`anim-fade-up delay-${(i + 1) * 200} card-lift group relative overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-7`}
              >
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-cyan-500 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{item.role}</h3>
                    <p className="mt-1 text-base font-semibold text-teal-400">{item.company}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{item.location}</p>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-bold text-neutral-300">
                    {item.period}
                  </span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {item.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-3 text-sm leading-6 text-neutral-400">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── STRENGTHS ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[420px_1fr]">
          <div className="self-start">
            <SectionLabel>Working strengths</SectionLabel>
            <h2 className="anim-fade-up mt-3 text-4xl font-bold tracking-tight lg:text-5xl">
              Calm engineering<br />for complex interfaces
            </h2>
            <p className="anim-fade-up delay-200 mt-4 text-base leading-7 text-neutral-400">
              Clarity, ownership, and craft — consistent across product cycles.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {strengths.map((s, i) => (
              <div
                key={s.text}
                className={`anim-fade-up delay-${(i % 6) * 100 + 100} card-lift flex items-center gap-4 rounded-xl border border-white/8 bg-white/4 p-4 transition-colors hover:border-teal-500/30 hover:bg-teal-500/5`}
              >
                <span className="text-xl">{s.icon}</span>
                <p className="text-sm font-semibold leading-snug text-neutral-200">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EDUCATION ── */}
      <section className="border-t border-white/8 bg-white/2 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionLabel>Education & Certifications</SectionLabel>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <CredCard
              icon={<GraduationCap className="h-5 w-5" />}
              title="B.E., Electronics & Communication Engineering"
              sub="Visvesvaraya Technological University · 2018–2022"
              delay="delay-100"
            />
            <CredCard
              icon={<BadgeCheck className="h-5 w-5" />}
              title="Foundations of Project Management"
              sub="Google · Certificate"
              delay="delay-200"
            />
            <CredCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Meta Frontend Developer Certificate"
              sub="Meta · Certificate"
              delay="delay-300"
            />
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="relative overflow-hidden border-t border-white/8 px-6 py-24 text-center">
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/8 blur-[80px]" />
        <div className="relative mx-auto max-w-2xl">
          <p className="anim-fade-up text-sm font-bold uppercase tracking-widest text-teal-400">
            Open to senior opportunities
          </p>
          <h2 className="anim-fade-up delay-100 mt-4 text-5xl font-black tracking-tight">
            Let&apos;s build something<br />
            <span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">
              worth shipping
            </span>
          </h2>
          <div className="anim-fade-up delay-200 mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="mailto:yashwanthkris153@gmail.com"
              className="group flex items-center gap-2 rounded-xl bg-teal-400 px-7 py-3.5 text-sm font-bold text-neutral-950 transition-all hover:bg-teal-300 hover:shadow-[0_0_32px_rgba(45,212,191,.45)]"
            >
              <Mail className="h-4 w-4" />
              Get in touch
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="https://www.linkedin.com/in/yashwanth-krishna-390015168/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-bold transition-all hover:border-white/40 hover:bg-white/10"
            >
              <Network className="h-4 w-4" />
              LinkedIn
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ── helpers ── */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="anim-slide-r text-xs font-bold uppercase tracking-widest text-teal-400">
      {children}
    </p>
  );
}

function ContactPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-sm text-neutral-300">
      {icon}
      {label}
    </span>
  );
}

function SignatureRow({
  icon,
  label,
  value,
  delay,
}: {
  icon: string;
  label: string;
  value: string;
  delay: string;
}) {
  return (
    <div
      className={`anim-fade-up ${delay} flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/5 px-4 py-2.5`}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-base leading-none">{icon}</span>
        <p className="text-sm font-semibold text-neutral-400">{label}</p>
      </div>
      <p className="text-sm font-bold text-teal-300">{value}</p>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  detail,
  delay,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  delay?: string;
}) {
  return (
    <div
      className={`anim-fade-up ${delay ?? ""} card-lift group rounded-2xl border border-white/10 bg-white/4 p-6 transition-colors hover:border-teal-500/30 hover:bg-teal-500/5`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{detail}</p>
    </div>
  );
}

function CredCard({
  icon,
  title,
  sub,
  delay,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  delay?: string;
}) {
  return (
    <div
      className={`anim-fade-up ${delay ?? ""} card-lift rounded-2xl border border-white/10 bg-white/4 p-6 transition-colors hover:border-teal-500/30`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/30">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-bold leading-snug text-white">{title}</h3>
      <p className="mt-1.5 text-xs text-neutral-500">{sub}</p>
    </div>
  );
}

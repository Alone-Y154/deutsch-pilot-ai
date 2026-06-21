import "server-only";

import { curriculumLevels } from "@/lib/curriculum";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clampScore } from "@/lib/utils";

export type DashboardMetric = {
  label: string;
  value: string;
  tone: "teal" | "amber" | "rose" | "blue";
  detail: string;
};

export type DashboardSkill = {
  skill: string;
  score: number;
  detail: string;
};

export type DashboardWeakTag = {
  tag: string;
  count: number;
  severity: number;
};

export type DashboardActivity = {
  title: string;
  detail: string;
  href: string;
  createdAt: string;
};

export type DashboardData = {
  configured: boolean;
  signedIn: boolean;
  user: {
    email: string;
    displayName: string;
    targetLevel: string;
    goal: string;
  } | null;
  metrics: DashboardMetric[];
  skills: DashboardSkill[];
  weakTags: DashboardWeakTag[];
  recentActivity: DashboardActivity[];
  recommendedLevel: (typeof curriculumLevels)[number];
  readinessScore: number | null;
  practiceCount: number;
};

type ProfileRow = {
  email?: string | null;
  display_name?: string | null;
  target_level?: string | null;
  goal?: string | null;
};

type SkillScoreRow = {
  skill?: string | null;
  score?: number | null;
  cefr_level?: string | null;
  updated_at?: string | null;
};

type SpeakingAttemptRow = {
  level?: string | null;
  mode?: string | null;
  task_title?: string | null;
  fluency_score?: number | null;
  task_completion_score?: number | null;
  weak_tags?: string[] | null;
  created_at?: string | null;
};

type ConversationReportRow = {
  level?: string | null;
  scenario_title?: string | null;
  weak_tags?: string[] | null;
  fluency_score?: number | null;
  grammar_score?: number | null;
  vocabulary_score?: number | null;
  task_completion_score?: number | null;
  created_at?: string | null;
};

type InterviewSessionRow = {
  status?: string | null;
  target_level?: string | null;
  interview_type?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type InterviewReportRow = {
  overall_readiness_score?: number | null;
  estimated_speaking_level?: string | null;
  grammar_score?: number | null;
  vocabulary_score?: number | null;
  fluency_score?: number | null;
  role_fit_score?: number | null;
  answer_structure_score?: number | null;
  confidence_score?: number | null;
  created_at?: string | null;
};

type WeaknessEventRow = {
  weak_tag?: string | null;
  severity?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type AiReportRow = {
  payload?: unknown;
  created_at?: string | null;
};

type ListeningSessionRow = {
  level: string;
  title: string;
  score: number | null;
  estimatedLevel: string | null;
  createdAt: string;
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const fallbackLevel = curriculumLevels[2];

  if (!supabase) {
    return {
      configured: false,
      signedIn: false,
      user: null,
      metrics: [],
      skills: [],
      weakTags: [],
      recentActivity: [],
      recommendedLevel: fallbackLevel,
      readinessScore: null,
      practiceCount: 0,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      configured: true,
      signedIn: false,
      user: null,
      metrics: guestMetrics(),
      skills: [],
      weakTags: [],
      recentActivity: [],
      recommendedLevel: fallbackLevel,
      readinessScore: null,
      practiceCount: 0,
    };
  }

  const [
    profileResult,
    skillScoresResult,
    speakingResult,
    conversationsResult,
    interviewSessionsResult,
    interviewReportsResult,
    weaknessEventsResult,
    listeningSessionsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, display_name, target_level, goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("skill_scores")
      .select("skill, score, cefr_level, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("speaking_attempts")
      .select("level, mode, task_title, fluency_score, task_completion_score, weak_tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("conversation_reports")
      .select("level, scenario_title, weak_tags, fluency_score, grammar_score, vocabulary_score, task_completion_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("interview_sessions")
      .select("status, target_level, interview_type, created_at, completed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("interview_reports")
      .select("overall_readiness_score, estimated_speaking_level, grammar_score, vocabulary_score, fluency_score, role_fit_score, answer_structure_score, confidence_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("weakness_events")
      .select("weak_tag, severity, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("ai_reports")
      .select("payload, created_at")
      .eq("user_id", user.id)
      .eq("report_type", "listening_session")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const profile = (profileResult.data || {}) as ProfileRow;
  const skillRows = (skillScoresResult.data || []) as SkillScoreRow[];
  const speakingRows = (speakingResult.data || []) as SpeakingAttemptRow[];
  const conversationRows = (conversationsResult.data || []) as ConversationReportRow[];
  const interviewSessionRows = (interviewSessionsResult.data || []) as InterviewSessionRow[];
  const interviewReportRows = (interviewReportsResult.data || []) as InterviewReportRow[];
  const weaknessRows = (weaknessEventsResult.data || []) as WeaknessEventRow[];
  const listeningRows = parseListeningSessions(
    (listeningSessionsResult.data || []) as AiReportRow[],
  );

  const displayName =
    profile.display_name ||
    readUserName(user.user_metadata) ||
    user.email?.split("@")[0] ||
    "German learner";
  const targetLevel = profile.target_level || latestLevel(speakingRows, conversationRows) || "B1";
  const readinessScore = getReadinessScore(
    interviewReportRows,
    speakingRows,
    conversationRows,
  );
  const practiceCount =
    speakingRows.length +
    conversationRows.length +
    interviewSessionRows.length +
    listeningRows.length;
  const weakTags = buildWeakTags(weaknessRows, speakingRows, conversationRows);
  const skills = buildSkills(
    skillRows,
    speakingRows,
    conversationRows,
    interviewReportRows,
    listeningRows,
  );
  const speakingEstimate =
    interviewReportRows.find((row) => row.estimated_speaking_level)?.estimated_speaking_level ||
    latestLevel(speakingRows, conversationRows) ||
    targetLevel;

  return {
    configured: true,
    signedIn: true,
    user: {
      email: profile.email || user.email || "",
      displayName,
      targetLevel,
      goal: profile.goal || "General German + exam readiness",
    },
    metrics: [
      {
        label: "Readiness",
        value: readinessScore === null ? "New" : `${readinessScore}%`,
        tone: "teal",
        detail:
          readinessScore === null
            ? "Complete a speaking or interview report"
            : "From your latest AI feedback",
      },
      {
        label: "Speaking estimate",
        value: speakingEstimate || targetLevel,
        tone: "rose",
        detail: "Based on recent speaking/interview work",
      },
      {
        label: "Weak spots active",
        value: String(weakTags.length),
        tone: "amber",
        detail: weakTags[0] ? `Top: ${weakTags[0].tag}` : "No weak tags saved yet",
      },
      {
        label: "Practice records",
        value: String(practiceCount),
        tone: "blue",
        detail: "Speaking, listening, calls, and interviews",
      },
    ],
    skills,
    weakTags,
    recentActivity: buildRecentActivity(
      speakingRows,
      conversationRows,
      interviewSessionRows,
      interviewReportRows,
      listeningRows,
    ),
    recommendedLevel:
      curriculumLevels.find((item) => item.level === targetLevel) || fallbackLevel,
    readinessScore,
    practiceCount,
  };
}

function guestMetrics(): DashboardMetric[] {
  return [
    {
      label: "Account",
      value: "Guest",
      tone: "teal",
      detail: "Sign in to save progress",
    },
    {
      label: "Readiness",
      value: "Start",
      tone: "rose",
      detail: "No user report yet",
    },
    {
      label: "Weak spots",
      value: "0",
      tone: "amber",
      detail: "Generated after practice",
    },
    {
      label: "Saved records",
      value: "0",
      tone: "blue",
      detail: "Requires an account",
    },
  ];
}

function buildSkills(
  skillRows: SkillScoreRow[],
  speakingRows: SpeakingAttemptRow[],
  conversationRows: ConversationReportRow[],
  interviewReportRows: InterviewReportRow[],
  listeningRows: ListeningSessionRow[],
): DashboardSkill[] {
  if (skillRows.length > 0) {
    const latestBySkill = new Map<string, DashboardSkill>();

    for (const row of skillRows) {
      if (!row.skill || typeof row.score !== "number" || latestBySkill.has(row.skill)) {
        continue;
      }

      latestBySkill.set(row.skill, {
        skill: row.skill,
        score: clampScore(row.score),
        detail: row.cefr_level ? `Estimated ${row.cefr_level}` : "Saved skill score",
      });
    }

    return Array.from(latestBySkill.values()).slice(0, 8);
  }

  const latestInterview = interviewReportRows[0];
  const derived = [
    {
      skill: "Speaking",
      values: [
        ...speakingRows.map((row) => row.fluency_score),
        ...conversationRows.map((row) => row.fluency_score),
        latestInterview?.fluency_score,
      ],
      detail: "Fluency from speaking and conversation attempts",
    },
    {
      skill: "Listening",
      values: listeningRows.map((row) => row.score),
      detail: "Comprehension from completed listening exercises",
    },
    {
      skill: "Grammar",
      values: [
        ...conversationRows.map((row) => row.grammar_score),
        latestInterview?.grammar_score,
      ],
      detail: "Grammar mistakes from reports",
    },
    {
      skill: "Vocabulary",
      values: [
        ...conversationRows.map((row) => row.vocabulary_score),
        latestInterview?.vocabulary_score,
      ],
      detail: "Vocabulary range from feedback",
    },
    {
      skill: "Task completion",
      values: [
        ...speakingRows.map((row) => row.task_completion_score),
        ...conversationRows.map((row) => row.task_completion_score),
      ],
      detail: "How completely tasks are answered",
    },
    {
      skill: "Interview role fit",
      values: [latestInterview?.role_fit_score],
      detail: "Latest interview performance report",
    },
    {
      skill: "Confidence",
      values: [latestInterview?.confidence_score],
      detail: "Latest spoken interview confidence",
    },
  ];

  return derived
    .map((item) => ({
      skill: item.skill,
      score: average(item.values),
      detail: item.detail,
    }))
    .filter((item) => item.score !== null)
    .map((item) => ({
      skill: item.skill,
      score: item.score || 0,
      detail: item.detail,
    }));
}

function buildWeakTags(
  weaknessRows: WeaknessEventRow[],
  speakingRows: SpeakingAttemptRow[],
  conversationRows: ConversationReportRow[],
) {
  const tagMap = new Map<string, DashboardWeakTag>();

  for (const row of weaknessRows) {
    if (!row.weak_tag || row.status === "resolved") continue;
    addWeakTag(tagMap, row.weak_tag, row.severity || 1);
  }

  for (const row of speakingRows) {
    for (const tag of row.weak_tags || []) {
      addWeakTag(tagMap, tag, 1);
    }
  }

  for (const row of conversationRows) {
    for (const tag of row.weak_tags || []) {
      addWeakTag(tagMap, tag, 1);
    }
  }

  return Array.from(tagMap.values())
    .sort((a, b) => b.severity - a.severity || b.count - a.count)
    .slice(0, 8);
}

function addWeakTag(
  tagMap: Map<string, DashboardWeakTag>,
  rawTag: string,
  severity: number,
) {
  const tag = rawTag.trim();

  if (!tag) return;

  const current = tagMap.get(tag);
  if (!current) {
    tagMap.set(tag, { tag, count: 1, severity });
    return;
  }

  tagMap.set(tag, {
    tag,
    count: current.count + 1,
    severity: Math.max(current.severity, severity),
  });
}

function buildRecentActivity(
  speakingRows: SpeakingAttemptRow[],
  conversationRows: ConversationReportRow[],
  interviewSessionRows: InterviewSessionRow[],
  interviewReportRows: InterviewReportRow[],
  listeningRows: ListeningSessionRow[],
): DashboardActivity[] {
  return [
    ...speakingRows.map((row) => ({
      title: row.task_title || "Speaking attempt",
      detail: `${row.level || "German"} ${row.mode || "speaking"} practice`,
      href: "/speaking-lab",
      createdAt: row.created_at || "",
    })),
    ...conversationRows.map((row) => ({
      title: row.scenario_title || "AI conversation",
      detail: `${row.level || "German"} conversation report`,
      href: "/learn",
      createdAt: row.created_at || "",
    })),
    ...interviewSessionRows.map((row) => ({
      title: "Interview session",
      detail: `${row.target_level || "German"} ${row.interview_type || "interview"} - ${row.status || "saved"}`,
      href: "/interview",
      createdAt: row.completed_at || row.created_at || "",
    })),
    ...interviewReportRows.map((row) => ({
      title: "Interview report",
      detail:
        typeof row.overall_readiness_score === "number"
          ? `${row.overall_readiness_score}% readiness`
          : "Final interview report",
      href: "/interview",
      createdAt: row.created_at || "",
    })),
    ...listeningRows.map((row) => ({
      title: row.title || "Listening exercise",
      detail:
        typeof row.score === "number"
          ? `${row.level} listening · ${row.score}%`
          : `${row.level} listening session`,
      href: "/listening-lab",
      createdAt: row.createdAt,
    })),
  ]
    .filter((item) => item.createdAt)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 8);
}

function parseListeningSessions(rows: AiReportRow[]): ListeningSessionRow[] {
  return rows.flatMap((row) => {
    if (!isRecord(row.payload) || row.payload.status !== "completed") {
      return [];
    }

    const exercise = isRecord(row.payload.exercise) ? row.payload.exercise : {};
    const report = isRecord(row.payload.report) ? row.payload.report : {};

    return [
      {
        level: readString(exercise.level) || "German",
        title: readString(exercise.title) || "Listening exercise",
        score: typeof report.score === "number" ? clampScore(report.score) : null,
        estimatedLevel: readString(report.estimatedLevel) || null,
        createdAt:
          readString(row.payload.completedAt) || row.created_at || "",
      },
    ];
  });
}

function getReadinessScore(
  interviewRows: InterviewReportRow[],
  speakingRows: SpeakingAttemptRow[],
  conversationRows: ConversationReportRow[],
) {
  const latestInterviewScore = interviewRows.find(
    (row) => typeof row.overall_readiness_score === "number",
  )?.overall_readiness_score;

  if (typeof latestInterviewScore === "number") {
    return clampScore(latestInterviewScore);
  }

  const derived = average([
    ...speakingRows.slice(0, 5).map((row) => row.task_completion_score),
    ...speakingRows.slice(0, 5).map((row) => row.fluency_score),
    ...conversationRows.slice(0, 5).map((row) => row.task_completion_score),
  ]);

  return derived;
}

function latestLevel(
  speakingRows: SpeakingAttemptRow[],
  conversationRows: ConversationReportRow[],
) {
  return speakingRows[0]?.level || conversationRows[0]?.level || null;
}

function average(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === "number");

  if (!numbers.length) {
    return null;
  }

  return clampScore(numbers.reduce((total, value) => total + value, 0) / numbers.length);
}

function readUserName(metadata: unknown) {
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  return typeof record.name === "string" ? record.name : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import "server-only";

import type { ProgressReport } from "@/lib/ai/workspace-schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clampScore } from "@/lib/utils";

export type ReportEntryType =
  | "speaking"
  | "listening"
  | "conversation"
  | "interview";

export type ReportScore = {
  label: string;
  score: number;
};

export type ReportCorrection = {
  original: string;
  corrected: string;
  explanation: string;
};

export type ReportQuestionReview = {
  prompt: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
  explanation: string;
};

export type LearnerReportEntry = {
  id: string;
  type: ReportEntryType;
  title: string;
  level: string;
  createdAt: string;
  score: number | null;
  summary: string;
  scores: ReportScore[];
  weakTags: string[];
  transcript: string | null;
  correctedText: string | null;
  strengths: string[];
  improvements: string[];
  corrections: ReportCorrection[];
  questionReviews: ReportQuestionReview[];
  nextActions: string[];
};

export type LearnerSkillSummary = {
  skill: string;
  score: number;
  level: string | null;
  trend: "up" | "flat" | "down";
  samples: number;
};

export type LearnerReportsData = {
  configured: boolean;
  signedIn: boolean;
  user: {
    displayName: string;
    goal: string;
    targetLevel: string;
  } | null;
  practiceCount: number;
  averageScore: number | null;
  latestActivityAt: string | null;
  skills: LearnerSkillSummary[];
  weakTags: Array<{ tag: string; count: number }>;
  entries: LearnerReportEntry[];
  latestAiReport: {
    report: ProgressReport;
    source: "openai" | "demo";
    createdAt: string;
  } | null;
};

type ProfileRow = {
  display_name?: string | null;
  goal?: string | null;
  target_level?: string | null;
};

type SkillScoreRow = {
  skill?: string | null;
  score?: number | null;
  cefr_level?: string | null;
  updated_at?: string | null;
};

type SpeakingRow = {
  id: string;
  level?: string | null;
  mode?: string | null;
  task_title?: string | null;
  transcript?: string | null;
  corrected_german?: string | null;
  feedback?: unknown;
  fluency_score?: number | null;
  task_completion_score?: number | null;
  weak_tags?: string[] | null;
  created_at?: string | null;
};

type ConversationRow = {
  id: string;
  level?: string | null;
  scenario_title?: string | null;
  conversation_history?: unknown;
  report?: unknown;
  weak_tags?: string[] | null;
  fluency_score?: number | null;
  grammar_score?: number | null;
  vocabulary_score?: number | null;
  task_completion_score?: number | null;
  created_at?: string | null;
};

type InterviewReportRow = {
  id: string;
  session_id?: string | null;
  report?: unknown;
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

type InterviewAnswerRow = {
  session_id?: string | null;
  transcript?: string | null;
  feedback?: unknown;
  weak_tags?: string[] | null;
  created_at?: string | null;
};

type AiReportRow = {
  id: string;
  report_type?: string | null;
  payload?: unknown;
  created_at?: string | null;
};

export async function getLearnerReportsData(): Promise<LearnerReportsData> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return emptyReports(false, false);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyReports(true, false);
  }

  const [
    profileResult,
    skillResult,
    speakingResult,
    conversationResult,
    interviewReportResult,
    interviewAnswerResult,
    aiReportResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, goal, target_level")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("skill_scores")
      .select("skill, score, cefr_level, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("speaking_attempts")
      .select(
        "id, level, mode, task_title, transcript, corrected_german, feedback, fluency_score, task_completion_score, weak_tags, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("conversation_reports")
      .select(
        "id, level, scenario_title, conversation_history, report, weak_tags, fluency_score, grammar_score, vocabulary_score, task_completion_score, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("interview_reports")
      .select(
        "id, session_id, report, overall_readiness_score, estimated_speaking_level, grammar_score, vocabulary_score, fluency_score, role_fit_score, answer_structure_score, confidence_score, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("interview_answers")
      .select("session_id, transcript, feedback, weak_tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(150),
    supabase
      .from("ai_reports")
      .select("id, report_type, payload, created_at")
      .eq("user_id", user.id)
      .in("report_type", ["listening_session", "progress_report"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const profile = (profileResult.data || {}) as ProfileRow;
  const skillRows = (skillResult.data || []) as SkillScoreRow[];
  const speakingRows = (speakingResult.data || []) as SpeakingRow[];
  const conversationRows = (conversationResult.data || []) as ConversationRow[];
  const interviewRows = (interviewReportResult.data || []) as InterviewReportRow[];
  const interviewAnswerRows = (interviewAnswerResult.data || []) as InterviewAnswerRow[];
  const aiReportRows = (aiReportResult.data || []) as AiReportRow[];
  const answersBySession = groupInterviewAnswers(interviewAnswerRows);

  const entries = [
    ...speakingRows.map(normalizeSpeakingEntry),
    ...conversationRows.map(normalizeConversationEntry),
    ...interviewRows.map((row) =>
      normalizeInterviewEntry(
        row,
        row.session_id ? answersBySession.get(row.session_id) || [] : [],
      ),
    ),
    ...aiReportRows.flatMap(normalizeListeningEntry),
  ]
    .filter((entry) => entry.createdAt)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const scoredEntries = entries.filter(
    (entry): entry is LearnerReportEntry & { score: number } =>
      typeof entry.score === "number",
  );
  const latestAiReport = parseLatestAiReport(aiReportRows);

  return {
    configured: true,
    signedIn: true,
    user: {
      displayName:
        profile.display_name ||
        readString(user.user_metadata?.name) ||
        user.email?.split("@")[0] ||
        "German learner",
      goal: profile.goal || "General German + exam readiness",
      targetLevel: profile.target_level || latestEntryLevel(entries) || "B1",
    },
    practiceCount: entries.length,
    averageScore: scoredEntries.length
      ? clampScore(
          scoredEntries.reduce((total, entry) => total + entry.score, 0) /
            scoredEntries.length,
        )
      : null,
    latestActivityAt: entries[0]?.createdAt || null,
    skills: buildSkillSummaries(skillRows, entries),
    weakTags: aggregateWeakTags(entries),
    entries,
    latestAiReport,
  };
}

export function buildPersistedReportPrompt(data: LearnerReportsData) {
  const recentEntries = data.entries.slice(0, 12);
  const currentGoal = data.user
    ? `${data.user.goal}. Target level: ${data.user.targetLevel}.`
    : "Improve German from saved practice evidence.";
  const recentPractice = recentEntries.length
    ? recentEntries
        .map((entry) => {
          const scores = entry.scores
            .map((score) => `${score.label} ${score.score}%`)
            .join(", ");
          return [
            `${entry.type}: ${entry.title} (${entry.level})`,
            typeof entry.score === "number" ? `overall ${entry.score}%` : "",
            scores,
            entry.summary,
          ]
            .filter(Boolean)
            .join(" — ");
        })
        .join("\n")
    : "No completed saved assessments yet.";
  const concerns = [
    data.weakTags.length
      ? `Recurring weak tags: ${data.weakTags
          .slice(0, 10)
          .map((item) => `${item.tag} (${item.count})`)
          .join(", ")}.`
      : "No recurring weak tags have been saved.",
    data.skills.length
      ? `Current measured skills: ${data.skills
          .map((skill) => `${skill.skill} ${skill.score}% (${skill.trend})`)
          .join(", ")}.`
      : "No skill score history has been saved.",
  ].join("\n");

  return { currentGoal, recentPractice, concerns };
}

function normalizeSpeakingEntry(row: SpeakingRow): LearnerReportEntry {
  const feedback = asRecord(row.feedback);
  const grammarMistakes = readRecordArray(feedback.grammarMistakes);
  const vocabulary = readRecordArray(feedback.vocabularyAlternatives);
  const scores = compactScores([
    ["Fluency", row.fluency_score],
    ["Task completion", row.task_completion_score],
  ]);

  return {
    id: `speaking-${row.id}`,
    type: "speaking",
    title: row.task_title || "Speaking attempt",
    level: readString(feedback.cefrLevel) || row.level || "German",
    createdAt: row.created_at || "",
    score: averageScores(scores),
    summary:
      readString(feedback.englishExplanation) ||
      `${row.mode || "Speaking"} practice feedback`,
    scores,
    weakTags: normalizeTags(row.weak_tags),
    transcript: row.transcript || null,
    correctedText:
      row.corrected_german || readString(feedback.correctedGerman) || null,
    strengths: readStringArray(feedback.strengths),
    improvements: [
      ...readStringArray(feedback.pronunciationIssues),
      ...grammarMistakes.map((item) => readString(item.explanation)).filter(Boolean),
      ...vocabulary.map((item) => readString(item.reason)).filter(Boolean),
    ],
    corrections: grammarMistakes.map((item) => ({
      original: readString(item.issue),
      corrected: readString(item.correction),
      explanation: readString(item.explanation),
    })),
    questionReviews: [],
    nextActions: [
      readString(feedback.retryPrompt),
      readString(feedback.nextDrill),
    ].filter(Boolean),
  };
}

function normalizeConversationEntry(row: ConversationRow): LearnerReportEntry {
  const report = asRecord(row.report);
  const history = Array.isArray(row.conversation_history)
    ? row.conversation_history
    : [];
  const learnerTranscript = history
    .filter(
      (message) =>
        isRecord(message) &&
        message.role === "learner" &&
        typeof message.content === "string",
    )
    .map((message) => readString((message as Record<string, unknown>).content))
    .join("\n");
  const scores = compactScores([
    ["Fluency", row.fluency_score],
    ["Grammar", row.grammar_score],
    ["Vocabulary", row.vocabulary_score],
    ["Task completion", row.task_completion_score],
  ]);

  return {
    id: `conversation-${row.id}`,
    type: "conversation",
    title: row.scenario_title || "Lesson conversation",
    level: readString(report.cefrEstimate) || row.level || "German",
    createdAt: row.created_at || "",
    score: averageScores(scores),
    summary: readString(report.summary) || "Completed German conversation report.",
    scores,
    weakTags: normalizeTags(row.weak_tags),
    transcript: learnerTranscript || null,
    correctedText: null,
    strengths: readStringArray(report.strengths),
    improvements: readStringArray(report.trainingPlan),
    corrections: readRecordArray(report.corrections).map((item) => ({
      original: readString(item.learnerText),
      corrected: readString(item.correctedGerman),
      explanation: readString(item.explanation),
    })),
    questionReviews: [],
    nextActions: [
      ...readStringArray(report.recommendedNextScenarios),
      ...readStringArray(report.trainingPlan),
    ],
  };
}

function normalizeInterviewEntry(
  row: InterviewReportRow,
  answers: InterviewAnswerRow[],
): LearnerReportEntry {
  const report = asRecord(row.report);
  const answerFeedback = answers.map((answer) => asRecord(answer.feedback));
  const scores = compactScores([
    ["Readiness", row.overall_readiness_score],
    ["Grammar", row.grammar_score],
    ["Vocabulary", row.vocabulary_score],
    ["Fluency", row.fluency_score],
    ["Role fit", row.role_fit_score],
    ["Answer structure", row.answer_structure_score],
    ["Confidence", row.confidence_score],
  ]);
  const corrections = answerFeedback.flatMap((feedback) =>
    readRecordArray(asRecord(feedback.language).grammarCorrections).map((item) => ({
      original: readString(item.issue),
      corrected: readString(item.correction),
      explanation: readString(item.explanation),
    })),
  );
  const weakTags = normalizeTags([
    ...answers.flatMap((answer) => answer.weak_tags || []),
    ...readStringArray(report.recurringLanguageIssues),
  ]);

  return {
    id: `interview-${row.id}`,
    type: "interview",
    title: "German interview report",
    level:
      row.estimated_speaking_level ||
      readString(report.estimatedSpeakingLevel) ||
      "German",
    createdAt: row.created_at || "",
    score:
      typeof row.overall_readiness_score === "number"
        ? clampScore(row.overall_readiness_score)
        : averageScores(scores),
    summary:
      readString(report.executiveSummary) || "Completed German mock interview.",
    scores,
    weakTags,
    transcript:
      answers
        .map((answer) => answer.transcript)
        .filter(Boolean)
        .join("\n\n") || null,
    correctedText:
      answerFeedback
        .map((feedback) => readString(feedback.correctedGermanAnswer))
        .filter(Boolean)
        .join("\n\n") || null,
    strengths: [
      ...readStringArray(report.strongestAnswers),
      ...answerFeedback.flatMap((feedback) =>
        readStringArray(asRecord(feedback.interview).strongSignals),
      ),
    ],
    improvements: [
      ...readStringArray(report.weakestAnswers),
      ...readStringArray(report.recurringLanguageIssues),
      ...readStringArray(report.missingJobSignals),
    ],
    corrections,
    questionReviews: [],
    nextActions: [
      ...readStringArray(report.recommendedGermanPhrases),
      ...readStringArray(report.sevenDayTrainingPlan),
      ...readStringArray(report.nextInterviewQuestions),
    ],
  };
}

function normalizeListeningEntry(row: AiReportRow): LearnerReportEntry[] {
  if (row.report_type !== "listening_session" || !isRecord(row.payload)) {
    return [];
  }

  const payload = row.payload;
  if (payload.status !== "completed") {
    return [];
  }

  const exercise = asRecord(payload.exercise);
  const report = asRecord(payload.report);
  const answers = asStringRecord(payload.answers);
  const questions = readRecordArray(exercise.questions);
  const skillScores = readRecordArray(report.skillScores);
  const scores = [
    ["Overall", readNumber(report.score)] as const,
    ...skillScores.map(
      (skill) =>
        [readString(skill.skill) || "Listening skill", readNumber(skill.score)] as const,
    ),
  ];

  return [
    {
      id: `listening-${row.id}`,
      type: "listening",
      title: readString(exercise.title) || "Listening exercise",
      level:
        readString(report.estimatedLevel) ||
        readString(exercise.level) ||
        "German",
      createdAt:
        readString(payload.completedAt) || row.created_at || "",
      score:
        typeof report.score === "number" ? clampScore(report.score) : null,
      summary:
        readString(report.summary) || "Completed German listening assessment.",
      scores: compactScores(scores),
      weakTags: normalizeTags(readStringArray(report.weakTags)),
      transcript: readString(exercise.transcriptGerman) || null,
      correctedText: null,
      strengths: readStringArray(report.strengths),
      improvements: readStringArray(report.improvementAreas),
      corrections: [],
      questionReviews: questions.map((question) => {
        const questionId = readString(question.id);
        const selected = answers[questionId] || "";
        const correct = readString(question.correctOption);

        return {
          prompt: readString(question.prompt),
          selected,
          correct,
          isCorrect: Boolean(selected && selected === correct),
          explanation: readString(question.explanation),
        };
      }),
      nextActions: readStringArray(report.nextActions),
    },
  ];
}

function buildSkillSummaries(
  rows: SkillScoreRow[],
  entries: LearnerReportEntry[],
): LearnerSkillSummary[] {
  const samples = new Map<
    string,
    Array<{ score: number; level: string | null; createdAt: string }>
  >();

  for (const row of rows) {
    if (!row.skill || typeof row.score !== "number") continue;
    const current = samples.get(row.skill) || [];
    current.push({
      score: clampScore(row.score),
      level: row.cefr_level || null,
      createdAt: row.updated_at || "",
    });
    samples.set(row.skill, current);
  }

  for (const entry of entries) {
    for (const score of entry.scores) {
      if (samples.has(score.label)) continue;
      samples.set(score.label, [
        {
          score: score.score,
          level: entry.level,
          createdAt: entry.createdAt,
        },
      ]);
    }
  }

  return Array.from(samples.entries())
    .map(([skill, values]) => {
      const sorted = [...values].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
      const latest = sorted[0];
      const previous = sorted[1];
      const difference = previous ? latest.score - previous.score : 0;

      return {
        skill,
        score: latest.score,
        level: latest.level,
        trend: difference >= 3 ? "up" : difference <= -3 ? "down" : "flat",
        samples: sorted.length,
      } satisfies LearnerSkillSummary;
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);
}

function aggregateWeakTags(entries: LearnerReportEntry[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    for (const tag of entry.weakTags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 12);
}

function parseLatestAiReport(rows: AiReportRow[]) {
  for (const row of rows) {
    if (row.report_type !== "progress_report" || !isRecord(row.payload)) {
      continue;
    }

    const report = parseProgressReport(row.payload.report);
    const rawSource = row.payload.source;
    if (report && (rawSource === "openai" || rawSource === "demo")) {
      const source: "openai" | "demo" = rawSource;
      return {
        report,
        source,
        createdAt:
          readString(row.payload.generatedAt) || row.created_at || "",
      };
    }
  }

  return null;
}

function parseProgressReport(value: unknown): ProgressReport | null {
  if (!isRecord(value)) return null;
  const skillScores = readRecordArray(value.skillScores).map((skill) => {
    const trend: "up" | "flat" | "down" =
      skill.trend === "up" || skill.trend === "down" ? skill.trend : "flat";

    return {
      skill: readString(skill.skill),
      score: clampScore(readNumber(skill.score) || 0),
      trend,
      action: readString(skill.action),
    };
  });
  const estimatedLevel = readString(value.estimatedLevel);

  if (
    !["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"].includes(
      estimatedLevel,
    )
  ) {
    return null;
  }

  return {
    summary: readString(value.summary),
    readinessScore: clampScore(readNumber(value.readinessScore) || 0),
    estimatedLevel: estimatedLevel as ProgressReport["estimatedLevel"],
    skillScores,
    wins: readStringArray(value.wins),
    risks: readStringArray(value.risks),
    nextActions: readStringArray(value.nextActions),
  };
}

function groupInterviewAnswers(rows: InterviewAnswerRow[]) {
  const groups = new Map<string, InterviewAnswerRow[]>();

  for (const row of rows) {
    if (!row.session_id) continue;
    groups.set(row.session_id, [...(groups.get(row.session_id) || []), row]);
  }

  return groups;
}

function compactScores(
  values: ReadonlyArray<readonly [string, number | null | undefined]>,
) {
  return values.flatMap(([label, score]) =>
    typeof score === "number"
      ? [{ label, score: clampScore(score) }]
      : [],
  );
}

function averageScores(scores: ReportScore[]) {
  return scores.length
    ? clampScore(
        scores.reduce((total, score) => total + score.score, 0) / scores.length,
      )
    : null;
}

function latestEntryLevel(entries: LearnerReportEntry[]) {
  return entries.find((entry) => entry.level)?.level || null;
}

function normalizeTags(value: unknown) {
  const tags = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readRecordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyReports(
  configured: boolean,
  signedIn: boolean,
): LearnerReportsData {
  return {
    configured,
    signedIn,
    user: null,
    practiceCount: 0,
    averageScore: null,
    latestActivityAt: null,
    skills: [],
    weakTags: [],
    entries: [],
    latestAiReport: null,
  };
}

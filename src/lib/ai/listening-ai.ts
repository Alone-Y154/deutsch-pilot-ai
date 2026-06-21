import "server-only";

import {
  listeningExerciseJsonSchema,
  listeningExerciseSchema,
  listeningReportJsonSchema,
  listeningReportSchema,
  type ListeningExercise,
  type ListeningReport,
} from "@/lib/ai/listening-schemas";
import {
  extractOutputText,
  getOpenAIErrorMessage,
  responsesUrl,
} from "@/lib/ai/response-utils";
import { clampScore } from "@/lib/utils";

export type ListeningExerciseRequest = {
  level: string;
  topic: string;
  format: string;
  questionCount: number;
};

export type ListeningReportRequest = {
  exercise: ListeningExercise;
  answers: Record<string, string>;
};

type AiResult<T> = {
  data: T;
  source: "openai" | "demo";
};

export type ListeningGrading = {
  correctCount: number;
  totalQuestions: number;
  score: number;
  results: Array<{
    questionId: string;
    skill: string;
    selectedOption: string;
    correctOption: string;
    correct: boolean;
  }>;
};

export async function generateListeningExercise(
  input: ListeningExerciseRequest,
): Promise<AiResult<ListeningExercise>> {
  const apiKey = process.env.OPENAI_API_KEY;
  const normalizedInput = {
    level: normalizeLevel(input.level),
    topic: input.topic.trim() || "everyday life",
    format: normalizeFormat(input.format),
    questionCount: Math.max(3, Math.min(Math.round(input.questionCount || 5), 8)),
  };

  if (!apiKey) {
    return { data: createDemoExercise(normalizedInput), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_listening_exercise",
    schema: listeningExerciseJsonSchema,
    system:
      "You are DeutschPilot AI, a CEFR-aligned German listening assessment designer. Create natural spoken German and fair comprehension questions.",
    user: {
      instruction:
        "Create one self-contained German listening exercise. The transcript must sound natural when spoken aloud, match the requested CEFR level, and contain enough evidence for every answer. Questions may be in simple German or English, but options must be unambiguous. Do not refer to information outside the transcript. Return exactly the requested number of questions.",
      ...normalizedInput,
    },
  });

  const parsed = listeningExerciseSchema.parse(
    JSON.parse(extractOutputText(data)),
  );

  return {
    data: {
      ...parsed,
      questions: parsed.questions.slice(0, normalizedInput.questionCount),
    },
    source: "openai",
  };
}

export async function generateListeningReport(
  input: ListeningReportRequest,
): Promise<AiResult<ListeningReport> & { grading: ListeningGrading }> {
  const grading = gradeListeningExercise(input.exercise, input.answers);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      data: createDemoReport(input.exercise, grading),
      grading,
      source: "demo",
    };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_listening_report",
    schema: listeningReportJsonSchema,
    system:
      "You are a German listening examiner and learning coach. Produce concise, actionable practice feedback. Scores are practice estimates, not official exam grades.",
    user: {
      instruction:
        "Use the deterministic grading supplied below. Explain listening strengths, weak comprehension skills, and next practice actions. Do not change the supplied score or correct count.",
      exercise: input.exercise,
      grading,
    },
  });

  const parsed = listeningReportSchema.parse(
    JSON.parse(extractOutputText(data)),
  );

  return {
    data: {
      ...parsed,
      score: grading.score,
      correctCount: grading.correctCount,
      totalQuestions: grading.totalQuestions,
    },
    grading,
    source: "openai",
  };
}

export function gradeListeningExercise(
  exercise: ListeningExercise,
  answers: Record<string, string>,
): ListeningGrading {
  const results = exercise.questions.map((question) => {
    const selectedOption = answers[question.id] || "";

    return {
      questionId: question.id,
      skill: question.skill,
      selectedOption,
      correctOption: question.correctOption,
      correct: selectedOption === question.correctOption,
    };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const totalQuestions = results.length;

  return {
    correctCount,
    totalQuestions,
    score: totalQuestions
      ? clampScore((correctCount / totalQuestions) * 100)
      : 0,
    results,
  };
}

async function runStructuredOpenAI({
  apiKey,
  schemaName,
  schema,
  system,
  user,
}: {
  apiKey: string;
  schemaName: string;
  schema: object;
  system: string;
  user: object;
}) {
  const response = await fetch(responsesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FEEDBACK_MODEL || "gpt-5.4-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getOpenAIErrorMessage(data));
  }

  return data;
}

function createDemoExercise(
  input: {
    level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    topic: string;
    format: ListeningExercise["format"];
    questionCount: number;
  },
): ListeningExercise {
  const questionPool: ListeningExercise["questions"] = [
    {
      id: "q1",
      skill: "main-idea",
      prompt: "Warum ruft Lara im Reisebüro an?",
      options: [
        "Sie möchte eine Reise umbuchen.",
        "Sie sucht eine neue Arbeitsstelle.",
        "Sie möchte einen Sprachkurs kündigen.",
        "Sie hat ihren Pass verloren.",
      ],
      correctOption: "Sie möchte eine Reise umbuchen.",
      explanation: "Lara sagt am Anfang, dass sie ihre Zugreise ändern muss.",
    },
    {
      id: "q2",
      skill: "detail",
      prompt: "Wann wollte Lara ursprünglich fahren?",
      options: ["Am Freitagmorgen", "Am Samstagabend", "Am Sonntagmittag"],
      correctOption: "Am Freitagmorgen",
      explanation: "Die ursprüngliche Fahrkarte ist für Freitagmorgen.",
    },
    {
      id: "q3",
      skill: "detail",
      prompt: "Warum kann Lara den ursprünglichen Zug nicht nehmen?",
      options: [
        "Sie muss länger arbeiten.",
        "Der Zug wurde abgesagt.",
        "Sie ist krank.",
        "Sie hat Besuch.",
      ],
      correctOption: "Sie muss länger arbeiten.",
      explanation: "Ihr Chef hat sie gebeten, am Freitag länger zu bleiben.",
    },
    {
      id: "q4",
      skill: "sequence",
      prompt: "Welche neue Verbindung wählt Lara?",
      options: [
        "Samstag um 9:20 Uhr",
        "Freitag um 18:40 Uhr",
        "Sonntag um 7:10 Uhr",
      ],
      correctOption: "Samstag um 9:20 Uhr",
      explanation: "Die Mitarbeiterin bietet diese Verbindung an und Lara bestätigt sie.",
    },
    {
      id: "q5",
      skill: "vocabulary",
      prompt: "Was bedeutet „Umbuchung“ in diesem Gespräch?",
      options: [
        "Eine bestehende Buchung ändern",
        "Eine Rechnung bezahlen",
        "Einen Koffer abholen",
        "Eine neue Stelle beginnen",
      ],
      correctOption: "Eine bestehende Buchung ändern",
      explanation: "Lara ändert Datum und Uhrzeit einer bereits gebuchten Reise.",
    },
  ];

  return {
    title: `${input.level} Hörverstehen: Reiseänderung`,
    level: input.level,
    topic: input.topic,
    format: input.format,
    situation: "Ein Telefongespräch mit einem Reisebüro.",
    instructions:
      "Listen without reading the transcript. You may replay the audio, then answer every question.",
    transcriptGerman:
      "Mitarbeiterin: Guten Tag, Reisebüro Nord, wie kann ich Ihnen helfen? Lara: Guten Tag. Ich habe eine Zugfahrt nach Hamburg für Freitagmorgen gebucht, aber ich muss sie leider umbuchen. Mein Chef hat mich gebeten, am Freitag länger zu arbeiten. Mitarbeiterin: Kein Problem. Möchten Sie am Freitagabend oder am Samstag fahren? Lara: Samstag wäre besser. Gibt es am Vormittag eine Verbindung? Mitarbeiterin: Ja, ein Zug fährt um neun Uhr zwanzig. Die Umbuchung kostet zehn Euro. Lara: Das passt. Dann nehme ich bitte den Zug am Samstag um neun Uhr zwanzig. Mitarbeiterin: Sehr gern. Sie bekommen gleich eine Bestätigung per E-Mail.",
    durationEstimateSeconds: 58,
    questions: questionPool.slice(0, input.questionCount),
    vocabularyAfterAnswer: [
      {
        german: "umbuchen",
        english: "to rebook",
        note: "Used when changing an existing reservation.",
      },
      {
        german: "die Verbindung",
        english: "connection/service",
        note: "Often used for train or bus routes.",
      },
      {
        german: "die Bestätigung",
        english: "confirmation",
        note: "A written confirmation of the change.",
      },
    ],
  };
}

function createDemoReport(
  exercise: ListeningExercise,
  grading: ListeningGrading,
): ListeningReport {
  const skillScores = buildSkillScores(grading);

  return {
    summary: `You answered ${grading.correctCount} of ${grading.totalQuestions} questions correctly in this ${exercise.level} listening task.`,
    score: grading.score,
    correctCount: grading.correctCount,
    totalQuestions: grading.totalQuestions,
    estimatedLevel:
      grading.score >= 80
        ? exercise.level
        : previousLevel(exercise.level),
    skillScores,
    strengths:
      grading.correctCount > 0
        ? ["You identified at least one key detail from the spoken German."]
        : ["You completed the full listening attempt."],
    improvementAreas: skillScores
      .filter((item) => item.score < 70)
      .map((item) => item.feedback),
    weakTags: skillScores
      .filter((item) => item.score < 70)
      .map((item) => `listening-${item.skill.toLowerCase().replace(/\s+/g, "-")}`),
    nextActions: [
      "Listen again while reading the revealed transcript.",
      "Shadow two sentences from the recording.",
      "Generate another task on the same topic and compare your score.",
    ],
  };
}

function buildSkillScores(grading: ListeningGrading) {
  const grouped = new Map<string, { correct: number; total: number }>();

  for (const result of grading.results) {
    const current = grouped.get(result.skill) || { correct: 0, total: 0 };
    grouped.set(result.skill, {
      correct: current.correct + (result.correct ? 1 : 0),
      total: current.total + 1,
    });
  }

  return Array.from(grouped.entries()).map(([skill, values]) => {
    const score = clampScore((values.correct / values.total) * 100);

    return {
      skill: skill.replace("-", " "),
      score,
      feedback:
        score >= 70
          ? `Good control of ${skill.replace("-", " ")} questions.`
          : `Practice ${skill.replace("-", " ")} questions with shorter audio clips.`,
    };
  });
}

function normalizeLevel(
  level: string,
): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  return ["A1", "A2", "B1", "B2", "C1", "C2"].includes(level)
    ? (level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2")
    : "B1";
}

function normalizeFormat(format: string): ListeningExercise["format"] {
  return ["dialogue", "announcement", "interview", "story", "news"].includes(format)
    ? (format as ListeningExercise["format"])
    : "dialogue";
}

function previousLevel(
  level: ListeningExercise["level"],
): ListeningReport["estimatedLevel"] {
  const levels: ListeningReport["estimatedLevel"][] = [
    "Pre-A1",
    "A1",
    "A2",
    "B1",
    "B2",
    "C1",
    "C2",
  ];
  const index = levels.indexOf(level);
  return levels[Math.max(0, index - 1)];
}

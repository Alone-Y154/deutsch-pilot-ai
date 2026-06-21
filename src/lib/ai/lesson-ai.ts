import "server-only";

import {
  conversationReportJsonSchema,
  conversationReportSchema,
  conversationTurnJsonSchema,
  conversationTurnSchema,
  curriculumMapJsonSchema,
  curriculumMapSchema,
  generatedLessonJsonSchema,
  generatedLessonSchema,
  lessonMoreBlockJsonSchema,
  lessonMoreBlockSchema,
  scenarioJsonSchema,
  scenarioSchema,
  type ConversationReport,
  type ConversationTurn,
  type CurriculumMap,
  type GeneratedLesson,
  type GeneratedScenario,
  type LessonMoreBlock,
} from "@/lib/ai/lesson-schemas";
import {
  extractOutputText,
  getOpenAIErrorMessage,
  responsesUrl,
} from "@/lib/ai/response-utils";

export type LessonGenerateRequest = {
  level: string;
  topic: string;
  goal?: string;
  weakTags?: string[];
};

export type CurriculumMapRequest = {
  level: string;
  title: string;
  focus: string;
  requestedFocus?: string;
};

export type LessonMoreRequest = {
  level: string;
  currentLessonTitle: string;
  currentGoal: string;
  userRequest: string;
  existingWeakTags?: string[];
};

export type ScenarioGenerateRequest = {
  level: string;
  topic: string;
  existingTitles?: string[];
  weakTags?: string[];
};

export type ConversationMessage = {
  role: "ai" | "learner";
  content: string;
};

export type ConversationTurnRequest = {
  level: string;
  scenario: GeneratedScenario;
  history: ConversationMessage[];
  learnerMessage: string;
};

export type ConversationReportRequest = {
  level: string;
  scenario: GeneratedScenario;
  history: ConversationMessage[];
};

type AiResult<T> = {
  data: T;
  source: "openai" | "demo";
};

export async function generateLesson(
  input: LessonGenerateRequest,
): Promise<AiResult<GeneratedLesson>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoLesson(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_generated_lesson",
    schema: generatedLessonJsonSchema,
    system:
      "You are DeutschPilot AI, a German curriculum designer. Create practical CEFR-aligned lessons with German examples and English explanations.",
    user: {
      instruction:
        "Generate one interactive German lesson. Keep it launch-ready, practical, and tied to a conversation scenario. Use accurate German with English support.",
      ...input,
    },
  });

  return {
    data: generatedLessonSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
  };
}

export async function generateCurriculumMap(
  input: CurriculumMapRequest,
): Promise<AiResult<CurriculumMap>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoCurriculumMap(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_curriculum_map",
    schema: curriculumMapJsonSchema,
    system:
      "You are DeutschPilot AI, a German curriculum architect. Expand CEFR levels into structured, practical, interactive learning maps.",
    user: {
      instruction:
        "Generate a usable German curriculum map for this CEFR level. Include modules, lesson ideas, assessment checkpoints, and weak spot watchlist. Keep it practical and production-ready.",
      ...input,
    },
  });

  return {
    data: curriculumMapSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
  };
}

export async function generateLessonMore(
  input: LessonMoreRequest,
): Promise<AiResult<LessonMoreBlock>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoLessonMore(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_lesson_more_block",
    schema: lessonMoreBlockJsonSchema,
    system:
      "You are DeutschPilot AI, a German tutor that expands lessons on demand with focused examples, drills, and conversation prompts.",
    user: {
      instruction:
        "Generate one focused expansion block related to the current lesson and the learner's request. Use English explanations and German examples. Do not repeat the same content from a generic intro lesson.",
      ...input,
    },
  });

  return {
    data: lessonMoreBlockSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
  };
}

export async function generateScenario(
  input: ScenarioGenerateRequest,
): Promise<AiResult<GeneratedScenario>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoScenario(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_conversation_scenario",
    schema: scenarioJsonSchema,
    system:
      "You create German conversation scenarios for learners. Scenarios must be realistic, CEFR-appropriate, and useful for spoken practice.",
    user: {
      instruction:
        "Generate a fresh scenario that is not a duplicate of the existing titles. Include useful vocabulary and assessment focus.",
      ...input,
    },
  });

  return {
    data: scenarioSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
  };
}

export async function generateConversationTurn(
  input: ConversationTurnRequest,
): Promise<AiResult<ConversationTurn>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoConversationTurn(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_conversation_turn",
    schema: conversationTurnJsonSchema,
    system:
      "You are a German roleplay partner and tutor. Keep the conversation primarily in German. Correct the learner lightly, then continue the scenario naturally.",
    user: {
      instruction:
        "Respond to the learner in German, give a short English hint, correct their latest German, and ask the next scenario-appropriate question. Do not end too early unless the scenario goals are complete.",
      ...input,
    },
  });

  return {
    data: conversationTurnSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
  };
}

export async function generateConversationReport(
  input: ConversationReportRequest,
): Promise<AiResult<ConversationReport>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoConversationReport(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_conversation_report",
    schema: conversationReportJsonSchema,
    system:
      "You are a German examiner and learning analyst. Produce a fair end-of-conversation report with actionable corrections. Scores are practice estimates only.",
    user: {
      instruction:
        "Analyze the full German conversation. Grade fluency, grammar, vocabulary, task completion, weak spots, and the next training plan. Keep explanations in English and corrected examples in German.",
      ...input,
    },
  });

  return {
    data: conversationReportSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
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

function createDemoLesson(input: LessonGenerateRequest): GeneratedLesson {
  const level = normalizeLevel(input.level);
  const topic = input.topic || "everyday German";

  return {
    title: `${level} ${topic} conversation lesson`,
    level,
    goal: `Handle a practical ${topic.toLowerCase()} conversation in German.`,
    warmupQuestion: "Was moechtest du heute auf Deutsch ueben?",
    explanation:
      "This AI-generated lesson teaches the exact language pattern needed for a realistic conversation. Demo mode is active until OPENAI_API_KEY is configured.",
    grammarFocus: [
      "Verb in position two in main clauses",
      "Polite requests with ich moechte",
      "Follow-up questions with wann, wo, wie viel",
    ],
    vocabulary: [
      {
        german: "Ich moechte ...",
        english: "I would like ...",
        example: "Ich moechte bitte einen Termin vereinbaren.",
      },
      {
        german: "Koennten Sie das wiederholen?",
        english: "Could you repeat that?",
        example: "Entschuldigung, koennten Sie das bitte wiederholen?",
      },
      {
        german: "Das passt mir gut.",
        english: "That works well for me.",
        example: "Am Freitag um zehn Uhr passt mir gut.",
      },
    ],
    tutorialSteps: [
      "Read the model phrases aloud slowly.",
      "Swap one detail in each sentence.",
      "Answer the AI scenario using full German sentences.",
      "Review the call report and repeat the weakest sentence.",
    ],
    microDrills: [
      {
        prompt: "Make this polite: Ich will einen Kaffee.",
        answer: "Ich moechte bitte einen Kaffee.",
        explanation: "Ich moechte is softer and more natural for service situations.",
      },
      {
        prompt: "Ask for repetition in German.",
        answer: "Koennten Sie das bitte wiederholen?",
        explanation: "Use koennten Sie for a polite formal request.",
      },
    ],
    conversationScenario: {
      title: `${topic} roleplay`,
      learnerRole: "Learner handling the situation in German",
      aiRole: "Helpful native German speaker",
      situation: `You need to complete a realistic ${topic.toLowerCase()} task.`,
      openingLine: "Guten Tag! Wie kann ich Ihnen helfen?",
      goals: ["Greet politely", "Explain what you need", "Ask one follow-up question"],
    },
    quickQuiz: [
      {
        question: "Which sentence is the most polite?",
        options: [
          "Ich will Kaffee.",
          "Ich moechte bitte einen Kaffee.",
          "Gib mir Kaffee.",
        ],
        answer: "Ich moechte bitte einen Kaffee.",
        explanation: "It uses a polite request form and bitte.",
      },
    ],
    weakSpotPrediction: input.weakTags?.length
      ? input.weakTags
      : ["verb-position", "polite-requests", "question-formation"],
  };
}

function createDemoCurriculumMap(input: CurriculumMapRequest): CurriculumMap {
  const level = normalizeLevel(input.level);
  const focus = input.requestedFocus || input.focus;

  return {
    level,
    title: `${level} expanded learning path`,
    learningPromise: `Build practical ${level} German through ${focus.toLowerCase()}.`,
    modules: [
      {
        id: `${level.toLowerCase()}-core-communication`,
        title: "Core communication",
        objective: "Use the most important sentence patterns in realistic situations.",
        skills: ["speaking", "listening", "grammar", "vocabulary"],
        estimatedMinutes: 75,
        lessonIdeas: [
          {
            title: "Introduce and respond",
            topic: "Personal information",
            outcome: "Answer common questions with correct verb position.",
            practiceType: "lesson",
          },
          {
            title: "Daily roleplay",
            topic: "Everyday conversation",
            outcome: "Complete a short AI dialogue with correction.",
            practiceType: "conversation",
          },
        ],
      },
      {
        id: `${level.toLowerCase()}-accuracy`,
        title: "Accuracy lab",
        objective: "Turn predictable mistakes into short drills.",
        skills: ["grammar", "writing", "speaking"],
        estimatedMinutes: 60,
        lessonIdeas: [
          {
            title: "Weak spot rebuild",
            topic: "Cases and word order",
            outcome: "Correct five sentences and speak them aloud.",
            practiceType: "weak-spot",
          },
          {
            title: "Checkpoint quiz",
            topic: "Level review",
            outcome: "Measure readiness before moving forward.",
            practiceType: "exam",
          },
        ],
      },
    ],
    assessment: [
      "One spoken roleplay",
      "One short writing correction",
      "One mixed vocabulary and grammar quiz",
    ],
    weakSpotWatchlist: ["verb-position", "articles", "case-marking", "fluency"],
  };
}

function createDemoLessonMore(input: LessonMoreRequest): LessonMoreBlock {
  return {
    title: `More practice: ${input.userRequest || input.currentLessonTitle}`,
    reason:
      "This expansion targets the exact topic the learner requested and connects it back to the current lesson.",
    explanation:
      "Demo mode is active. With OpenAI configured, this block becomes a tailored expansion with richer examples and drills.",
    examples: [
      {
        german: "Ich moechte das genauer ueben.",
        english: "I would like to practice that more precisely.",
        note: "Useful when asking for focused practice.",
      },
      {
        german: "Koennen wir ein Beispiel mit meinem Alltag machen?",
        english: "Can we make an example with my daily life?",
        note: "A practical way to personalize learning.",
      },
    ],
    drills: [
      {
        prompt: "Turn this into a polite request: Ich will mehr Beispiele.",
        answer: "Ich moechte bitte mehr Beispiele.",
        explanation: "Ich moechte bitte is more natural and polite.",
      },
    ],
    conversationPrompts: [
      "Ask the AI partner for one example related to your work.",
      "Explain what you want to practice and why.",
    ],
    miniQuiz: [
      {
        question: "How do you politely say: I would like more examples?",
        answer: "Ich moechte bitte mehr Beispiele.",
        explanation: "Use moechte for polite requests.",
      },
    ],
    weakTags: input.existingWeakTags?.length
      ? input.existingWeakTags
      : ["polite-requests", "fluency"],
  };
}

function createDemoScenario(input: ScenarioGenerateRequest): GeneratedScenario {
  const level = normalizeLevel(input.level);
  const topic = input.topic || "daily life";
  const id = `demo-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

  return {
    id,
    title: `${topic} surprise scenario`,
    level,
    learnerRole: "German learner",
    aiRole: "Native German conversation partner",
    setting: `A realistic ${topic.toLowerCase()} situation in Germany.`,
    openingLine: "Guten Tag! Was kann ich fuer Sie tun?",
    goals: ["Start politely", "Give two details", "Ask a follow-up question"],
    vocabulary: [
      { german: "ich suche", english: "I am looking for" },
      { german: "ich brauche", english: "I need" },
      { german: "wie viel kostet das?", english: "how much does that cost?" },
    ],
    assessmentFocus: input.weakTags?.length
      ? input.weakTags
      : ["word-order", "vocabulary-range", "fluency"],
  };
}

function createDemoConversationTurn(input: ConversationTurnRequest): ConversationTurn {
  const learnerMessage = input.learnerMessage.trim() || "Ich brauche Hilfe.";

  return {
    aiGermanReply:
      "Sehr gut. Ich verstehe. Koennen Sie mir noch ein Detail geben, zum Beispiel die Uhrzeit oder den Ort?",
    englishHint:
      "Good. Continue in German and add one concrete detail so the conversation can move forward.",
    correction: {
      correctedGerman: learnerMessage,
      explanation:
        "Demo mode keeps your sentence mostly unchanged. With OPENAI_API_KEY, this becomes precise correction.",
      weakTags: ["detail-building", "fluency"],
    },
    nextPrompt: "Antworten Sie mit einem ganzen Satz und einer konkreten Information.",
    shouldContinue: true,
  };
}

function createDemoConversationReport(input: ConversationReportRequest): ConversationReport {
  const learnerMessages = input.history
    .filter((message) => message.role === "learner")
    .map((message) => message.content);

  return {
    summary:
      "You completed a short German roleplay. Demo mode gives a sample report until OpenAI is configured.",
    cefrEstimate: normalizeLevel(input.level),
    fluencyScore: 64,
    grammarScore: 58,
    vocabularyScore: 66,
    taskCompletionScore: 72,
    strengths: ["You stayed in the conversation.", "You used understandable German."],
    corrections: learnerMessages.slice(0, 3).map((message) => ({
      learnerText: message,
      correctedGerman: message,
      explanation:
        "Configure OPENAI_API_KEY for detailed correction of this sentence.",
    })),
    weakTags: ["verb-position", "case-marking", "fluency"],
    recommendedNextScenarios: [
      "Apartment viewing with questions",
      "Doctor appointment with symptoms",
      "Train delay at the station",
    ],
    trainingPlan: [
      "Repeat the corrected sentences aloud twice.",
      "Do one weak-spot drill for verb position.",
      "Ask for one new scenario and complete four turns.",
    ],
  };
}

function normalizeLevel(level: string): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  if (["A1", "A2", "B1", "B2", "C1", "C2"].includes(level)) {
    return level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  }

  return "A1";
}

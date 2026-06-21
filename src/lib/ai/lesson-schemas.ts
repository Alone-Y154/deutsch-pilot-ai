import { z } from "zod";

export const generatedLessonSchema = z.object({
  title: z.string(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  goal: z.string(),
  warmupQuestion: z.string(),
  explanation: z.string(),
  grammarFocus: z.array(z.string()),
  vocabulary: z.array(
    z.object({
      german: z.string(),
      english: z.string(),
      example: z.string(),
    }),
  ),
  tutorialSteps: z.array(z.string()),
  microDrills: z.array(
    z.object({
      prompt: z.string(),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
  conversationScenario: z.object({
    title: z.string(),
    learnerRole: z.string(),
    aiRole: z.string(),
    situation: z.string(),
    openingLine: z.string(),
    goals: z.array(z.string()),
  }),
  quickQuiz: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
  weakSpotPrediction: z.array(z.string()),
});

export type GeneratedLesson = z.infer<typeof generatedLessonSchema>;

export const curriculumMapSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  title: z.string(),
  learningPromise: z.string(),
  modules: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      objective: z.string(),
      skills: z.array(z.string()),
      estimatedMinutes: z.number().int().min(5).max(180),
      lessonIdeas: z.array(
        z.object({
          title: z.string(),
          topic: z.string(),
          outcome: z.string(),
          practiceType: z.enum(["lesson", "conversation", "exam", "weak-spot"]),
        }),
      ),
    }),
  ),
  assessment: z.array(z.string()),
  weakSpotWatchlist: z.array(z.string()),
});

export type CurriculumMap = z.infer<typeof curriculumMapSchema>;

export const lessonMoreBlockSchema = z.object({
  title: z.string(),
  reason: z.string(),
  explanation: z.string(),
  examples: z.array(
    z.object({
      german: z.string(),
      english: z.string(),
      note: z.string(),
    }),
  ),
  drills: z.array(
    z.object({
      prompt: z.string(),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
  conversationPrompts: z.array(z.string()),
  miniQuiz: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
  weakTags: z.array(z.string()),
});

export type LessonMoreBlock = z.infer<typeof lessonMoreBlockSchema>;

export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  learnerRole: z.string(),
  aiRole: z.string(),
  setting: z.string(),
  openingLine: z.string(),
  goals: z.array(z.string()),
  vocabulary: z.array(
    z.object({
      german: z.string(),
      english: z.string(),
    }),
  ),
  assessmentFocus: z.array(z.string()),
});

export type GeneratedScenario = z.infer<typeof scenarioSchema>;

export const conversationTurnSchema = z.object({
  aiGermanReply: z.string(),
  englishHint: z.string(),
  correction: z.object({
    correctedGerman: z.string(),
    explanation: z.string(),
    weakTags: z.array(z.string()),
  }),
  nextPrompt: z.string(),
  shouldContinue: z.boolean(),
});

export type ConversationTurn = z.infer<typeof conversationTurnSchema>;

export const conversationReportSchema = z.object({
  summary: z.string(),
  cefrEstimate: z.enum(["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"]),
  fluencyScore: z.number().int().min(0).max(100),
  grammarScore: z.number().int().min(0).max(100),
  vocabularyScore: z.number().int().min(0).max(100),
  taskCompletionScore: z.number().int().min(0).max(100),
  strengths: z.array(z.string()),
  corrections: z.array(
    z.object({
      learnerText: z.string(),
      correctedGerman: z.string(),
      explanation: z.string(),
    }),
  ),
  weakTags: z.array(z.string()),
  recommendedNextScenarios: z.array(z.string()),
  trainingPlan: z.array(z.string()),
});

export type ConversationReport = z.infer<typeof conversationReportSchema>;

export const generatedLessonJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "level",
    "goal",
    "warmupQuestion",
    "explanation",
    "grammarFocus",
    "vocabulary",
    "tutorialSteps",
    "microDrills",
    "conversationScenario",
    "quickQuiz",
    "weakSpotPrediction",
  ],
  properties: {
    title: { type: "string" },
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    goal: { type: "string" },
    warmupQuestion: { type: "string" },
    explanation: { type: "string" },
    grammarFocus: { type: "array", items: { type: "string" } },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["german", "english", "example"],
        properties: {
          german: { type: "string" },
          english: { type: "string" },
          example: { type: "string" },
        },
      },
    },
    tutorialSteps: { type: "array", items: { type: "string" } },
    microDrills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["prompt", "answer", "explanation"],
        properties: {
          prompt: { type: "string" },
          answer: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    conversationScenario: {
      type: "object",
      additionalProperties: false,
      required: ["title", "learnerRole", "aiRole", "situation", "openingLine", "goals"],
      properties: {
        title: { type: "string" },
        learnerRole: { type: "string" },
        aiRole: { type: "string" },
        situation: { type: "string" },
        openingLine: { type: "string" },
        goals: { type: "array", items: { type: "string" } },
      },
    },
    quickQuiz: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "answer", "explanation"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    weakSpotPrediction: { type: "array", items: { type: "string" } },
  },
} as const;

export const curriculumMapJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "level",
    "title",
    "learningPromise",
    "modules",
    "assessment",
    "weakSpotWatchlist",
  ],
  properties: {
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    title: { type: "string" },
    learningPromise: { type: "string" },
    modules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "objective", "skills", "estimatedMinutes", "lessonIdeas"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          objective: { type: "string" },
          skills: { type: "array", items: { type: "string" } },
          estimatedMinutes: { type: "integer", minimum: 5, maximum: 180 },
          lessonIdeas: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "topic", "outcome", "practiceType"],
              properties: {
                title: { type: "string" },
                topic: { type: "string" },
                outcome: { type: "string" },
                practiceType: {
                  type: "string",
                  enum: ["lesson", "conversation", "exam", "weak-spot"],
                },
              },
            },
          },
        },
      },
    },
    assessment: { type: "array", items: { type: "string" } },
    weakSpotWatchlist: { type: "array", items: { type: "string" } },
  },
} as const;

export const lessonMoreBlockJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "reason",
    "explanation",
    "examples",
    "drills",
    "conversationPrompts",
    "miniQuiz",
    "weakTags",
  ],
  properties: {
    title: { type: "string" },
    reason: { type: "string" },
    explanation: { type: "string" },
    examples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["german", "english", "note"],
        properties: {
          german: { type: "string" },
          english: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    drills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["prompt", "answer", "explanation"],
        properties: {
          prompt: { type: "string" },
          answer: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    conversationPrompts: { type: "array", items: { type: "string" } },
    miniQuiz: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer", "explanation"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    weakTags: { type: "array", items: { type: "string" } },
  },
} as const;

export const scenarioJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "level",
    "learnerRole",
    "aiRole",
    "setting",
    "openingLine",
    "goals",
    "vocabulary",
    "assessmentFocus",
  ],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    learnerRole: { type: "string" },
    aiRole: { type: "string" },
    setting: { type: "string" },
    openingLine: { type: "string" },
    goals: { type: "array", items: { type: "string" } },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["german", "english"],
        properties: {
          german: { type: "string" },
          english: { type: "string" },
        },
      },
    },
    assessmentFocus: { type: "array", items: { type: "string" } },
  },
} as const;

export const conversationTurnJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["aiGermanReply", "englishHint", "correction", "nextPrompt", "shouldContinue"],
  properties: {
    aiGermanReply: { type: "string" },
    englishHint: { type: "string" },
    correction: {
      type: "object",
      additionalProperties: false,
      required: ["correctedGerman", "explanation", "weakTags"],
      properties: {
        correctedGerman: { type: "string" },
        explanation: { type: "string" },
        weakTags: { type: "array", items: { type: "string" } },
      },
    },
    nextPrompt: { type: "string" },
    shouldContinue: { type: "boolean" },
  },
} as const;

export const conversationReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "cefrEstimate",
    "fluencyScore",
    "grammarScore",
    "vocabularyScore",
    "taskCompletionScore",
    "strengths",
    "corrections",
    "weakTags",
    "recommendedNextScenarios",
    "trainingPlan",
  ],
  properties: {
    summary: { type: "string" },
    cefrEstimate: {
      type: "string",
      enum: ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"],
    },
    fluencyScore: { type: "integer", minimum: 0, maximum: 100 },
    grammarScore: { type: "integer", minimum: 0, maximum: 100 },
    vocabularyScore: { type: "integer", minimum: 0, maximum: 100 },
    taskCompletionScore: { type: "integer", minimum: 0, maximum: 100 },
    strengths: { type: "array", items: { type: "string" } },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["learnerText", "correctedGerman", "explanation"],
        properties: {
          learnerText: { type: "string" },
          correctedGerman: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    weakTags: { type: "array", items: { type: "string" } },
    recommendedNextScenarios: { type: "array", items: { type: "string" } },
    trainingPlan: { type: "array", items: { type: "string" } },
  },
} as const;

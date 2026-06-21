import { z } from "zod";

export const listeningLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const listeningFormatSchema = z.enum([
  "dialogue",
  "announcement",
  "interview",
  "story",
  "news",
]);
export type ListeningFormat = z.infer<typeof listeningFormatSchema>;

export const listeningAudioScriptSegmentSchema = z.object({
  speaker: z.string().min(1).max(60),
  role: z.string().min(1).max(100),
  text: z.string().min(2).max(1200),
});
export type ListeningAudioScriptSegment = z.infer<
  typeof listeningAudioScriptSegmentSchema
>;

export const listeningQuestionSchema = z.object({
  id: z.string(),
  skill: z.enum(["main-idea", "detail", "inference", "vocabulary", "sequence"]),
  prompt: z.string(),
  options: z.array(z.string()).min(3).max(4),
  correctOption: z.string(),
  explanation: z.string(),
});

export const listeningExerciseSchema = z.object({
  title: z.string(),
  level: listeningLevelSchema,
  topic: z.string(),
  format: listeningFormatSchema,
  situation: z.string(),
  instructions: z.string(),
  transcriptGerman: z.string(),
  audioScript: z.array(listeningAudioScriptSegmentSchema).min(1).max(16),
  durationEstimateSeconds: z.number().int().min(20).max(240),
  questions: z.array(listeningQuestionSchema).min(3).max(8),
  vocabularyAfterAnswer: z.array(
    z.object({
      german: z.string(),
      english: z.string(),
      note: z.string(),
    }),
  ),
});

export type ListeningExercise = z.infer<typeof listeningExerciseSchema>;

export const listeningReportSchema = z.object({
  summary: z.string(),
  score: z.number().int().min(0).max(100),
  correctCount: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  estimatedLevel: z.enum(["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"]),
  skillScores: z.array(
    z.object({
      skill: z.string(),
      score: z.number().int().min(0).max(100),
      feedback: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  improvementAreas: z.array(z.string()),
  weakTags: z.array(z.string()),
  nextActions: z.array(z.string()),
});

export type ListeningReport = z.infer<typeof listeningReportSchema>;

export const listeningExerciseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "level",
    "topic",
    "format",
    "situation",
    "instructions",
    "transcriptGerman",
    "audioScript",
    "durationEstimateSeconds",
    "questions",
    "vocabularyAfterAnswer",
  ],
  properties: {
    title: { type: "string" },
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    topic: { type: "string" },
    format: {
      type: "string",
      enum: ["dialogue", "announcement", "interview", "story", "news"],
    },
    situation: { type: "string" },
    instructions: { type: "string" },
    transcriptGerman: { type: "string" },
    audioScript: {
      type: "array",
      minItems: 1,
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "role", "text"],
        properties: {
          speaker: { type: "string" },
          role: { type: "string" },
          text: { type: "string" },
        },
      },
    },
    durationEstimateSeconds: {
      type: "integer",
      minimum: 20,
      maximum: 240,
    },
    questions: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "skill",
          "prompt",
          "options",
          "correctOption",
          "explanation",
        ],
        properties: {
          id: { type: "string" },
          skill: {
            type: "string",
            enum: ["main-idea", "detail", "inference", "vocabulary", "sequence"],
          },
          prompt: { type: "string" },
          options: {
            type: "array",
            minItems: 3,
            maxItems: 4,
            items: { type: "string" },
          },
          correctOption: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    vocabularyAfterAnswer: {
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
  },
} as const;

export const listeningReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "score",
    "correctCount",
    "totalQuestions",
    "estimatedLevel",
    "skillScores",
    "strengths",
    "improvementAreas",
    "weakTags",
    "nextActions",
  ],
  properties: {
    summary: { type: "string" },
    score: { type: "integer", minimum: 0, maximum: 100 },
    correctCount: { type: "integer", minimum: 0 },
    totalQuestions: { type: "integer", minimum: 1 },
    estimatedLevel: {
      type: "string",
      enum: ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"],
    },
    skillScores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["skill", "score", "feedback"],
        properties: {
          skill: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          feedback: { type: "string" },
        },
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    improvementAreas: { type: "array", items: { type: "string" } },
    weakTags: { type: "array", items: { type: "string" } },
    nextActions: { type: "array", items: { type: "string" } },
  },
} as const;

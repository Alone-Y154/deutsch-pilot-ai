import { z } from "zod";

export const speechFeedbackSchema = z.object({
  whatLearnerSaid: z.string(),
  correctedGerman: z.string(),
  englishExplanation: z.string(),
  pronunciationIssues: z.array(z.string()),
  grammarMistakes: z.array(
    z.object({
      issue: z.string(),
      correction: z.string(),
      explanation: z.string(),
    }),
  ),
  vocabularyAlternatives: z.array(
    z.object({
      original: z.string(),
      better: z.string(),
      reason: z.string(),
    }),
  ),
  fluencyScore: z.number().int().min(0).max(100),
  taskCompletionScore: z.number().int().min(0).max(100),
  cefrLevel: z.enum(["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"]),
  strengths: z.array(z.string()),
  retryPrompt: z.string(),
  nextDrill: z.string(),
  weakTags: z.array(z.string()),
});

export type SpeechFeedback = z.infer<typeof speechFeedbackSchema>;

export const speechFeedbackJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "whatLearnerSaid",
    "correctedGerman",
    "englishExplanation",
    "pronunciationIssues",
    "grammarMistakes",
    "vocabularyAlternatives",
    "fluencyScore",
    "taskCompletionScore",
    "cefrLevel",
    "strengths",
    "retryPrompt",
    "nextDrill",
    "weakTags",
  ],
  properties: {
    whatLearnerSaid: { type: "string" },
    correctedGerman: { type: "string" },
    englishExplanation: { type: "string" },
    pronunciationIssues: {
      type: "array",
      items: { type: "string" },
    },
    grammarMistakes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["issue", "correction", "explanation"],
        properties: {
          issue: { type: "string" },
          correction: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    vocabularyAlternatives: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "better", "reason"],
        properties: {
          original: { type: "string" },
          better: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    fluencyScore: { type: "integer", minimum: 0, maximum: 100 },
    taskCompletionScore: { type: "integer", minimum: 0, maximum: 100 },
    cefrLevel: {
      type: "string",
      enum: ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"],
    },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
    retryPrompt: { type: "string" },
    nextDrill: { type: "string" },
    weakTags: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

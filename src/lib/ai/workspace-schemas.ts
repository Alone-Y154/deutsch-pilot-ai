import { z } from "zod";

const cefrSchema = z.enum(["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"]);

export const weakSpotPlanSchema = z.object({
  title: z.string(),
  level: z.string(),
  diagnosis: z.string(),
  drills: z.array(
    z.object({
      title: z.string(),
      type: z.enum(["speaking", "grammar", "vocabulary", "listening", "writing"]),
      prompt: z.string(),
      modelAnswer: z.string(),
      explanation: z.string(),
    }),
  ),
  speakingPrompt: z.string(),
  reviewChecklist: z.array(z.string()),
  nextActions: z.array(z.string()),
  weakTags: z.array(z.string()),
});

export type WeakSpotPlan = z.infer<typeof weakSpotPlanSchema>;

export const examPracticeSchema = z.object({
  title: z.string(),
  examType: z.string(),
  level: z.string(),
  sections: z.array(
    z.object({
      name: z.string(),
      timingMinutes: z.number().int().min(1).max(180),
      task: z.string(),
      instructions: z.string(),
      questions: z.array(
        z.object({
          prompt: z.string(),
          expectedAnswer: z.string(),
          skill: z.string(),
        }),
      ),
    }),
  ),
  speakingPrompt: z.string(),
  writingPrompt: z.string(),
  scoringRubric: z.array(z.string()),
  readinessAdvice: z.array(z.string()),
});

export type ExamPractice = z.infer<typeof examPracticeSchema>;

export const diagnosticPlanSchema = z.object({
  estimatedLevel: cefrSchema,
  goalSummary: z.string(),
  skillScores: z.array(
    z.object({
      skill: z.string(),
      score: z.number().int().min(0).max(100),
      reason: z.string(),
    }),
  ),
  weakTags: z.array(z.string()),
  recommendedStart: z.string(),
  firstWeekPlan: z.array(z.string()),
  placementTasks: z.array(z.string()),
});

export type DiagnosticPlan = z.infer<typeof diagnosticPlanSchema>;

export const progressReportSchema = z.object({
  summary: z.string(),
  readinessScore: z.number().int().min(0).max(100),
  estimatedLevel: cefrSchema,
  skillScores: z.array(
    z.object({
      skill: z.string(),
      score: z.number().int().min(0).max(100),
      trend: z.enum(["up", "flat", "down"]),
      action: z.string(),
    }),
  ),
  wins: z.array(z.string()),
  risks: z.array(z.string()),
  nextActions: z.array(z.string()),
});

export type ProgressReport = z.infer<typeof progressReportSchema>;

export const weakSpotPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "level", "diagnosis", "drills", "speakingPrompt", "reviewChecklist", "nextActions", "weakTags"],
  properties: {
    title: { type: "string" },
    level: { type: "string" },
    diagnosis: { type: "string" },
    drills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "type", "prompt", "modelAnswer", "explanation"],
        properties: {
          title: { type: "string" },
          type: { type: "string", enum: ["speaking", "grammar", "vocabulary", "listening", "writing"] },
          prompt: { type: "string" },
          modelAnswer: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    speakingPrompt: { type: "string" },
    reviewChecklist: { type: "array", items: { type: "string" } },
    nextActions: { type: "array", items: { type: "string" } },
    weakTags: { type: "array", items: { type: "string" } },
  },
} as const;

export const examPracticeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "examType", "level", "sections", "speakingPrompt", "writingPrompt", "scoringRubric", "readinessAdvice"],
  properties: {
    title: { type: "string" },
    examType: { type: "string" },
    level: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "timingMinutes", "task", "instructions", "questions"],
        properties: {
          name: { type: "string" },
          timingMinutes: { type: "integer", minimum: 1, maximum: 180 },
          task: { type: "string" },
          instructions: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["prompt", "expectedAnswer", "skill"],
              properties: {
                prompt: { type: "string" },
                expectedAnswer: { type: "string" },
                skill: { type: "string" },
              },
            },
          },
        },
      },
    },
    speakingPrompt: { type: "string" },
    writingPrompt: { type: "string" },
    scoringRubric: { type: "array", items: { type: "string" } },
    readinessAdvice: { type: "array", items: { type: "string" } },
  },
} as const;

export const diagnosticPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["estimatedLevel", "goalSummary", "skillScores", "weakTags", "recommendedStart", "firstWeekPlan", "placementTasks"],
  properties: {
    estimatedLevel: { type: "string", enum: ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"] },
    goalSummary: { type: "string" },
    skillScores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["skill", "score", "reason"],
        properties: {
          skill: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          reason: { type: "string" },
        },
      },
    },
    weakTags: { type: "array", items: { type: "string" } },
    recommendedStart: { type: "string" },
    firstWeekPlan: { type: "array", items: { type: "string" } },
    placementTasks: { type: "array", items: { type: "string" } },
  },
} as const;

export const progressReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "readinessScore", "estimatedLevel", "skillScores", "wins", "risks", "nextActions"],
  properties: {
    summary: { type: "string" },
    readinessScore: { type: "integer", minimum: 0, maximum: 100 },
    estimatedLevel: { type: "string", enum: ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"] },
    skillScores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["skill", "score", "trend", "action"],
        properties: {
          skill: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          trend: { type: "string", enum: ["up", "flat", "down"] },
          action: { type: "string" },
        },
      },
    },
    wins: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    nextActions: { type: "array", items: { type: "string" } },
  },
} as const;

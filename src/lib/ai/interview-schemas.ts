import { z } from "zod";

export const interviewLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const interviewProfileAnalysisSchema = z.object({
  roleTitle: z.string(),
  companyContext: z.string(),
  targetLevel: interviewLevelSchema,
  candidateSummary: z.string(),
  jobSummary: z.string(),
  matchStrengths: z.array(z.string()),
  resumeGaps: z.array(z.string()),
  likelyInterviewThemes: z.array(z.string()),
  germanVocabularyPack: z.array(
    z.object({
      german: z.string(),
      english: z.string(),
      usage: z.string(),
    }),
  ),
  answerStrategy: z.array(z.string()),
});

export type InterviewProfileAnalysis = z.infer<typeof interviewProfileAnalysisSchema>;

export const interviewQuestionSchema = z.object({
  id: z.string(),
  category: z.enum(["hr", "behavioral", "technical", "role-fit", "culture-fit"]),
  difficulty: z.enum(["warmup", "standard", "challenging"]),
  questionGerman: z.string(),
  questionEnglish: z.string(),
  followUpsGerman: z.array(z.string()),
  expectedSignals: z.array(z.string()),
  vocabularyTargets: z.array(z.string()),
  answerFramework: z.string(),
});

export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

export const interviewQuestionSetSchema = z.object({
  title: z.string(),
  targetLevel: interviewLevelSchema,
  interviewType: z.string(),
  questions: z.array(interviewQuestionSchema),
  warmupAdvice: z.string(),
  pressureTips: z.array(z.string()),
});

export type InterviewQuestionSet = z.infer<typeof interviewQuestionSetSchema>;

export const interviewAnswerFeedbackSchema = z.object({
  transcript: z.string(),
  correctedGermanAnswer: z.string(),
  conciseModelAnswerGerman: z.string(),
  englishFeedback: z.string(),
  language: z.object({
    grammarScore: z.number().int().min(0).max(100),
    vocabularyScore: z.number().int().min(0).max(100),
    fluencyScore: z.number().int().min(0).max(100),
    pronunciationNotes: z.array(z.string()),
    grammarCorrections: z.array(
      z.object({
        issue: z.string(),
        correction: z.string(),
        explanation: z.string(),
      }),
    ),
    vocabularyUpgrades: z.array(
      z.object({
        original: z.string(),
        stronger: z.string(),
        reason: z.string(),
      }),
    ),
  }),
  interview: z.object({
    roleFitScore: z.number().int().min(0).max(100),
    answerStructureScore: z.number().int().min(0).max(100),
    confidenceScore: z.number().int().min(0).max(100),
    missedSignals: z.array(z.string()),
    strongSignals: z.array(z.string()),
    followUpRisk: z.string(),
  }),
  weakTags: z.array(z.string()),
  retryPromptGerman: z.string(),
});

export type InterviewAnswerFeedback = z.infer<typeof interviewAnswerFeedbackSchema>;

export const interviewFinalReportSchema = z.object({
  executiveSummary: z.string(),
  targetLevel: interviewLevelSchema,
  estimatedSpeakingLevel: z.enum(["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"]),
  overallReadinessScore: z.number().int().min(0).max(100),
  languageScores: z.object({
    grammar: z.number().int().min(0).max(100),
    vocabulary: z.number().int().min(0).max(100),
    fluency: z.number().int().min(0).max(100),
    pronunciation: z.number().int().min(0).max(100),
  }),
  interviewScores: z.object({
    roleFit: z.number().int().min(0).max(100),
    answerStructure: z.number().int().min(0).max(100),
    confidence: z.number().int().min(0).max(100),
    evidenceQuality: z.number().int().min(0).max(100),
  }),
  strongestAnswers: z.array(z.string()),
  weakestAnswers: z.array(z.string()),
  recurringLanguageIssues: z.array(z.string()),
  missingJobSignals: z.array(z.string()),
  recommendedGermanPhrases: z.array(z.string()),
  sevenDayTrainingPlan: z.array(z.string()),
  nextInterviewQuestions: z.array(z.string()),
});

export type InterviewFinalReport = z.infer<typeof interviewFinalReportSchema>;

export const interviewProfileAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "roleTitle",
    "companyContext",
    "targetLevel",
    "candidateSummary",
    "jobSummary",
    "matchStrengths",
    "resumeGaps",
    "likelyInterviewThemes",
    "germanVocabularyPack",
    "answerStrategy",
  ],
  properties: {
    roleTitle: { type: "string" },
    companyContext: { type: "string" },
    targetLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    candidateSummary: { type: "string" },
    jobSummary: { type: "string" },
    matchStrengths: { type: "array", items: { type: "string" } },
    resumeGaps: { type: "array", items: { type: "string" } },
    likelyInterviewThemes: { type: "array", items: { type: "string" } },
    germanVocabularyPack: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["german", "english", "usage"],
        properties: {
          german: { type: "string" },
          english: { type: "string" },
          usage: { type: "string" },
        },
      },
    },
    answerStrategy: { type: "array", items: { type: "string" } },
  },
} as const;

export const interviewQuestionSetJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "targetLevel", "interviewType", "questions", "warmupAdvice", "pressureTips"],
  properties: {
    title: { type: "string" },
    targetLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    interviewType: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "category",
          "difficulty",
          "questionGerman",
          "questionEnglish",
          "followUpsGerman",
          "expectedSignals",
          "vocabularyTargets",
          "answerFramework",
        ],
        properties: {
          id: { type: "string" },
          category: {
            type: "string",
            enum: ["hr", "behavioral", "technical", "role-fit", "culture-fit"],
          },
          difficulty: {
            type: "string",
            enum: ["warmup", "standard", "challenging"],
          },
          questionGerman: { type: "string" },
          questionEnglish: { type: "string" },
          followUpsGerman: { type: "array", items: { type: "string" } },
          expectedSignals: { type: "array", items: { type: "string" } },
          vocabularyTargets: { type: "array", items: { type: "string" } },
          answerFramework: { type: "string" },
        },
      },
    },
    warmupAdvice: { type: "string" },
    pressureTips: { type: "array", items: { type: "string" } },
  },
} as const;

export const interviewAnswerFeedbackJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "transcript",
    "correctedGermanAnswer",
    "conciseModelAnswerGerman",
    "englishFeedback",
    "language",
    "interview",
    "weakTags",
    "retryPromptGerman",
  ],
  properties: {
    transcript: { type: "string" },
    correctedGermanAnswer: { type: "string" },
    conciseModelAnswerGerman: { type: "string" },
    englishFeedback: { type: "string" },
    language: {
      type: "object",
      additionalProperties: false,
      required: [
        "grammarScore",
        "vocabularyScore",
        "fluencyScore",
        "pronunciationNotes",
        "grammarCorrections",
        "vocabularyUpgrades",
      ],
      properties: {
        grammarScore: { type: "integer", minimum: 0, maximum: 100 },
        vocabularyScore: { type: "integer", minimum: 0, maximum: 100 },
        fluencyScore: { type: "integer", minimum: 0, maximum: 100 },
        pronunciationNotes: { type: "array", items: { type: "string" } },
        grammarCorrections: {
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
        vocabularyUpgrades: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["original", "stronger", "reason"],
            properties: {
              original: { type: "string" },
              stronger: { type: "string" },
              reason: { type: "string" },
            },
          },
        },
      },
    },
    interview: {
      type: "object",
      additionalProperties: false,
      required: [
        "roleFitScore",
        "answerStructureScore",
        "confidenceScore",
        "missedSignals",
        "strongSignals",
        "followUpRisk",
      ],
      properties: {
        roleFitScore: { type: "integer", minimum: 0, maximum: 100 },
        answerStructureScore: { type: "integer", minimum: 0, maximum: 100 },
        confidenceScore: { type: "integer", minimum: 0, maximum: 100 },
        missedSignals: { type: "array", items: { type: "string" } },
        strongSignals: { type: "array", items: { type: "string" } },
        followUpRisk: { type: "string" },
      },
    },
    weakTags: { type: "array", items: { type: "string" } },
    retryPromptGerman: { type: "string" },
  },
} as const;

export const interviewFinalReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary",
    "targetLevel",
    "estimatedSpeakingLevel",
    "overallReadinessScore",
    "languageScores",
    "interviewScores",
    "strongestAnswers",
    "weakestAnswers",
    "recurringLanguageIssues",
    "missingJobSignals",
    "recommendedGermanPhrases",
    "sevenDayTrainingPlan",
    "nextInterviewQuestions",
  ],
  properties: {
    executiveSummary: { type: "string" },
    targetLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    estimatedSpeakingLevel: {
      type: "string",
      enum: ["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"],
    },
    overallReadinessScore: { type: "integer", minimum: 0, maximum: 100 },
    languageScores: {
      type: "object",
      additionalProperties: false,
      required: ["grammar", "vocabulary", "fluency", "pronunciation"],
      properties: {
        grammar: { type: "integer", minimum: 0, maximum: 100 },
        vocabulary: { type: "integer", minimum: 0, maximum: 100 },
        fluency: { type: "integer", minimum: 0, maximum: 100 },
        pronunciation: { type: "integer", minimum: 0, maximum: 100 },
      },
    },
    interviewScores: {
      type: "object",
      additionalProperties: false,
      required: ["roleFit", "answerStructure", "confidence", "evidenceQuality"],
      properties: {
        roleFit: { type: "integer", minimum: 0, maximum: 100 },
        answerStructure: { type: "integer", minimum: 0, maximum: 100 },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        evidenceQuality: { type: "integer", minimum: 0, maximum: 100 },
      },
    },
    strongestAnswers: { type: "array", items: { type: "string" } },
    weakestAnswers: { type: "array", items: { type: "string" } },
    recurringLanguageIssues: { type: "array", items: { type: "string" } },
    missingJobSignals: { type: "array", items: { type: "string" } },
    recommendedGermanPhrases: { type: "array", items: { type: "string" } },
    sevenDayTrainingPlan: { type: "array", items: { type: "string" } },
    nextInterviewQuestions: { type: "array", items: { type: "string" } },
  },
} as const;

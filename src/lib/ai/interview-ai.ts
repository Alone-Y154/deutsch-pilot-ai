import "server-only";

import {
  interviewAnswerFeedbackJsonSchema,
  interviewAnswerFeedbackSchema,
  interviewFinalReportJsonSchema,
  interviewFinalReportSchema,
  interviewProfileAnalysisJsonSchema,
  interviewProfileAnalysisSchema,
  interviewQuestionSetJsonSchema,
  interviewQuestionSetSchema,
  type InterviewAnswerFeedback,
  type InterviewFinalReport,
  type InterviewProfileAnalysis,
  type InterviewQuestion,
  type InterviewQuestionSet,
} from "@/lib/ai/interview-schemas";
import {
  extractOutputText,
  getOpenAIErrorMessage,
  responsesUrl,
} from "@/lib/ai/response-utils";

export type InterviewSetupInput = {
  jobDescription: string;
  resume: string;
  targetLevel: string;
  interviewType: string;
  questionCount: number;
};

export type InterviewQuestionsInput = InterviewSetupInput & {
  analysis: InterviewProfileAnalysis;
};

export type InterviewAnswerFeedbackInput = InterviewSetupInput & {
  analysis: InterviewProfileAnalysis;
  question: InterviewQuestion;
  transcript: string;
};

export type InterviewFinalReportInput = InterviewSetupInput & {
  analysis: InterviewProfileAnalysis;
  questionSet: InterviewQuestionSet;
  answers: Array<{
    question: InterviewQuestion;
    transcript: string;
    feedback: InterviewAnswerFeedback;
  }>;
};

type AiResult<T> = {
  data: T;
  source: "openai" | "demo";
};

export async function analyzeInterviewProfile(
  input: InterviewSetupInput,
): Promise<AiResult<InterviewProfileAnalysis>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoAnalysis(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_interview_profile_analysis",
    schema: interviewProfileAnalysisJsonSchema,
    system:
      "You are DeutschPilot AI, a German interview coach and recruiting analyst. Analyze a job description and resume for German interview preparation.",
    user: {
      instruction:
        "Create a concise interview profile. Identify role fit, gaps, likely German interview themes, vocabulary, and answer strategy. Do not fabricate credentials beyond the resume.",
      ...input,
    },
  });

  return {
    data: interviewProfileAnalysisSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
  };
}

export async function generateInterviewQuestions(
  input: InterviewQuestionsInput,
): Promise<AiResult<InterviewQuestionSet>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoQuestions(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_interview_question_set",
    schema: interviewQuestionSetJsonSchema,
    system:
      "You generate realistic German job interview question sets. Questions must be role-specific, CEFR-aware, and grouped across HR, behavioral, technical, role-fit, and culture-fit.",
    user: {
      instruction:
        "Generate likely German interview questions for the candidate and job. Use German questions, English translations, follow-ups, expected answer signals, vocabulary targets, and answer frameworks.",
      ...input,
    },
  });

  return {
    data: interviewQuestionSetSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
  };
}

export async function generateInterviewAnswerFeedback(
  input: InterviewAnswerFeedbackInput,
): Promise<AiResult<InterviewAnswerFeedback>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoAnswerFeedback(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_interview_answer_feedback",
    schema: interviewAnswerFeedbackJsonSchema,
    system:
      "You are a German language examiner and interview coach. Grade spoken interview answers for language, role fit, structure, confidence, and job-signal coverage.",
    user: {
      instruction:
        "Assess the learner's spoken German answer. Give corrected German, a concise model answer, English feedback, language scores, interview scores, weak tags, and a retry prompt.",
      ...input,
    },
  });

  return {
    data: interviewAnswerFeedbackSchema.parse(JSON.parse(extractOutputText(data))),
    source: "openai",
  };
}

export async function generateInterviewFinalReport(
  input: InterviewFinalReportInput,
): Promise<AiResult<InterviewFinalReport>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { data: createDemoFinalReport(input), source: "demo" };
  }

  const data = await runStructuredOpenAI({
    apiKey,
    schemaName: "german_interview_final_report",
    schema: interviewFinalReportJsonSchema,
    system:
      "You are a senior German interview coach. Produce a final mock-interview report with language and interview-performance analysis. Scores are practice feedback only.",
    user: {
      instruction:
        "Analyze all answers together. Report language readiness, interview readiness, strongest and weakest answers, recurring issues, missing job signals, German phrases, 7-day plan, and next questions.",
      ...input,
    },
  });

  return {
    data: interviewFinalReportSchema.parse(JSON.parse(extractOutputText(data))),
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

function createDemoAnalysis(input: InterviewSetupInput): InterviewProfileAnalysis {
  const level = normalizeLevel(input.targetLevel);

  return {
    roleTitle: "German-speaking Customer Success Specialist",
    companyContext: "Demo company context inferred from the pasted job description.",
    targetLevel: level,
    candidateSummary:
      "The candidate appears to have customer-facing experience and should prepare concise German examples with measurable impact.",
    jobSummary:
      "The role likely requires communication, problem solving, stakeholder management, and confidence in German workplace situations.",
    matchStrengths: [
      "Customer communication experience",
      "Problem-solving examples from prior roles",
      "Clear motivation for German-speaking work",
    ],
    resumeGaps: [
      "Prepare one German example for conflict resolution.",
      "Prepare numbers that prove impact.",
    ],
    likelyInterviewThemes: [
      "Motivation for the role",
      "Handling difficult customers",
      "Explaining technical topics simply",
      "Working in a German-speaking team",
    ],
    germanVocabularyPack: [
      {
        german: "die Kundenbetreuung",
        english: "customer support / customer success",
        usage: "Ich habe Erfahrung in der Kundenbetreuung.",
      },
      {
        german: "eine Loesung finden",
        english: "to find a solution",
        usage: "Ich versuche zuerst, die Ursache zu verstehen und dann eine Loesung zu finden.",
      },
      {
        german: "zuverlaessig",
        english: "reliable",
        usage: "Meine Kolleginnen und Kollegen beschreiben mich als zuverlaessig.",
      },
    ],
    answerStrategy: [
      "Answer with Situation, Task, Action, Result.",
      "Use one concrete example per behavioral answer.",
      "Keep German sentences clear before making them complex.",
    ],
  };
}

function createDemoQuestions(input: InterviewQuestionsInput): InterviewQuestionSet {
  const level = normalizeLevel(input.targetLevel);
  const count = Math.max(3, Math.min(input.questionCount || 8, 12));
  const baseQuestions: InterviewQuestion[] = [
    {
      id: "q-hr-intro",
      category: "hr",
      difficulty: "warmup",
      questionGerman: "Erzaehlen Sie mir bitte kurz etwas ueber sich.",
      questionEnglish: "Please briefly tell me about yourself.",
      followUpsGerman: ["Warum interessieren Sie sich fuer diese Stelle?"],
      expectedSignals: ["Clear professional summary", "Motivation", "Relevant experience"],
      vocabularyTargets: ["Berufserfahrung", "Staerken", "Motivation"],
      answerFramework: "Present role, relevant experience, reason for this job.",
    },
    {
      id: "q-behavioral-conflict",
      category: "behavioral",
      difficulty: "standard",
      questionGerman:
        "Beschreiben Sie eine Situation, in der Sie ein schwieriges Problem geloest haben.",
      questionEnglish: "Describe a situation where you solved a difficult problem.",
      followUpsGerman: ["Was haben Sie konkret gemacht?", "Was war das Ergebnis?"],
      expectedSignals: ["Concrete example", "Action ownership", "Measurable result"],
      vocabularyTargets: ["Herausforderung", "Massnahme", "Ergebnis"],
      answerFramework: "Situation, task, action, result.",
    },
    {
      id: "q-role-fit",
      category: "role-fit",
      difficulty: "standard",
      questionGerman:
        "Welche Erfahrungen aus Ihrem Lebenslauf passen besonders gut zu dieser Stelle?",
      questionEnglish: "Which experiences from your resume fit this role especially well?",
      followUpsGerman: ["Koennen Sie ein Beispiel nennen?"],
      expectedSignals: ["Resume-to-role connection", "Relevant skills", "Specific evidence"],
      vocabularyTargets: ["passt zu", "Erfahrung", "Verantwortung"],
      answerFramework: "Name two matching experiences and prove one with an example.",
    },
    {
      id: "q-technical",
      category: "technical",
      difficulty: "challenging",
      questionGerman:
        "Wie wuerden Sie einem Kunden ein komplexes Problem einfach erklaeren?",
      questionEnglish: "How would you explain a complex problem simply to a customer?",
      followUpsGerman: ["Welche Schritte wuerden Sie verwenden?"],
      expectedSignals: ["Clear process", "Empathy", "Simple language"],
      vocabularyTargets: ["erklaeren", "Schritt fuer Schritt", "verstaendlich"],
      answerFramework: "Understand the customer, simplify the issue, confirm understanding.",
    },
    {
      id: "q-culture",
      category: "culture-fit",
      difficulty: "standard",
      questionGerman: "Wie arbeiten Sie in einem internationalen Team?",
      questionEnglish: "How do you work in an international team?",
      followUpsGerman: ["Wie gehen Sie mit Missverstaendnissen um?"],
      expectedSignals: ["Collaboration", "Communication", "Cultural awareness"],
      vocabularyTargets: ["Zusammenarbeit", "Kommunikation", "Missverstaendnis"],
      answerFramework: "Explain your communication style and one team example.",
    },
  ];

  const questions = Array.from({ length: count }, (_, index) => {
    const template = baseQuestions[index % baseQuestions.length];
    return { ...template, id: `${template.id}-${index + 1}` };
  });

  return {
    title: `${input.analysis.roleTitle} mock interview`,
    targetLevel: level,
    interviewType: input.interviewType,
    questions,
    warmupAdvice:
      "Speak slowly, answer directly, and add one concrete example before you add detail.",
    pressureTips: [
      "If you need time, say: Einen Moment bitte, ich ueberlege kurz.",
      "If you miss a word, explain it with simpler German.",
      "End each answer with a result or learning.",
    ],
  };
}

function createDemoAnswerFeedback(
  input: InterviewAnswerFeedbackInput,
): InterviewAnswerFeedback {
  const transcript = input.transcript.trim() || "Ich habe Erfahrung und ich lerne schnell.";

  return {
    transcript,
    correctedGermanAnswer:
      "Ich habe relevante Erfahrung in diesem Bereich und lerne schnell. In meiner letzten Rolle habe ich Kundenprobleme analysiert und passende Loesungen gefunden.",
    conciseModelAnswerGerman:
      "Ich bringe Erfahrung in der Kundenkommunikation mit und kann Probleme strukturiert loesen. Zum Beispiel habe ich in meiner letzten Position wiederkehrende Kundenfragen analysiert und die Antwortzeit verbessert.",
    englishFeedback:
      "Demo feedback: your answer is understandable, but it needs a clearer example, stronger role connection, and a result.",
    language: {
      grammarScore: 62,
      vocabularyScore: 66,
      fluencyScore: 61,
      pronunciationNotes: [
        "Keep endings clear on verbs and plural nouns.",
        "Pause after each idea instead of rushing the full answer.",
      ],
      grammarCorrections: [
        {
          issue: "Answer structure",
          correction: "Use two short main clauses before adding subordinate clauses.",
          explanation: "Clear structure matters more than complexity in interviews.",
        },
      ],
      vocabularyUpgrades: [
        {
          original: "gut",
          stronger: "relevant / strukturiert / zuverlaessig",
          reason: "Specific adjectives sound more professional.",
        },
      ],
    },
    interview: {
      roleFitScore: 68,
      answerStructureScore: 58,
      confidenceScore: 64,
      missedSignals: input.question.expectedSignals.slice(0, 2),
      strongSignals: ["You attempted a direct answer."],
      followUpRisk:
        "The interviewer may ask for a concrete example or measurable result.",
    },
    weakTags: ["answer-structure", "role-fit-evidence", "professional-vocabulary"],
    retryPromptGerman:
      "Antworten Sie noch einmal mit Situation, Handlung und Ergebnis in drei Saetzen.",
  };
}

function createDemoFinalReport(input: InterviewFinalReportInput): InterviewFinalReport {
  const answered = input.answers.length;

  return {
    executiveSummary: `You completed ${answered} interview answers. Demo mode shows the report shape until OPENAI_API_KEY is configured.`,
    targetLevel: normalizeLevel(input.targetLevel),
    estimatedSpeakingLevel: normalizeLevel(input.targetLevel),
    overallReadinessScore: answered >= 3 ? 68 : 54,
    languageScores: {
      grammar: 62,
      vocabulary: 66,
      fluency: 61,
      pronunciation: 60,
    },
    interviewScores: {
      roleFit: 68,
      answerStructure: 58,
      confidence: 64,
      evidenceQuality: 55,
    },
    strongestAnswers: ["The strongest answers connected experience to customer work."],
    weakestAnswers: ["Some answers need clearer examples and measurable results."],
    recurringLanguageIssues: [
      "Verb position after connectors",
      "Professional vocabulary precision",
      "Long answers without structure",
    ],
    missingJobSignals: [
      "Specific metrics",
      "Examples of stakeholder communication",
      "Conflict resolution details",
    ],
    recommendedGermanPhrases: [
      "Ein konkretes Beispiel dafuer ist ...",
      "Das Ergebnis war, dass ...",
      "Ich wuerde zuerst die Ursache analysieren.",
    ],
    sevenDayTrainingPlan: [
      "Day 1: Prepare a 60-second self-introduction in German.",
      "Day 2: Practice three STAR answers aloud.",
      "Day 3: Drill role-specific vocabulary.",
      "Day 4: Record answers to two challenging follow-ups.",
      "Day 5: Improve grammar in weil/dass clauses.",
      "Day 6: Complete a full mock interview.",
      "Day 7: Repeat weakest answers with stronger metrics.",
    ],
    nextInterviewQuestions: [
      "Warum sollten wir Sie einstellen?",
      "Was war Ihr groesster beruflicher Erfolg?",
      "Wie reagieren Sie auf Kritik?",
    ],
  };
}

function normalizeLevel(level: string): "A1" | "A2" | "B1" | "B2" | "C1" | "C2" {
  if (["A1", "A2", "B1", "B2", "C1", "C2"].includes(level)) {
    return level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  }

  return "B1";
}

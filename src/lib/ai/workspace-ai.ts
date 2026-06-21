import "server-only";

import {
  diagnosticPlanJsonSchema,
  diagnosticPlanSchema,
  examPracticeJsonSchema,
  examPracticeSchema,
  progressReportJsonSchema,
  progressReportSchema,
  weakSpotPlanJsonSchema,
  weakSpotPlanSchema,
  type DiagnosticPlan,
  type ExamPractice,
  type ProgressReport,
  type WeakSpotPlan,
} from "@/lib/ai/workspace-schemas";
import {
  extractOutputText,
  getOpenAIErrorMessage,
  responsesUrl,
} from "@/lib/ai/response-utils";

type AiResult<T> = { data: T; source: "openai" | "demo" };

export async function generateWeakSpotPlan(input: {
  level: string;
  weakArea: string;
  context: string;
}): Promise<AiResult<WeakSpotPlan>> {
  if (!process.env.OPENAI_API_KEY) return { data: demoWeakSpot(input), source: "demo" };
  const data = await runStructured("german_weak_spot_plan", weakSpotPlanJsonSchema, "You create targeted German weak-spot training plans.", input);
  return { data: weakSpotPlanSchema.parse(JSON.parse(extractOutputText(data))), source: "openai" };
}

export async function generateExamPractice(input: {
  level: string;
  examType: string;
  focus: string;
}): Promise<AiResult<ExamPractice>> {
  if (!process.env.OPENAI_API_KEY) return { data: demoExam(input), source: "demo" };
  const data = await runStructured("german_exam_practice", examPracticeJsonSchema, "You create unofficial German exam practice tasks. Never claim official exam affiliation.", input);
  return { data: examPracticeSchema.parse(JSON.parse(extractOutputText(data))), source: "openai" };
}

export async function generateDiagnosticPlan(input: {
  goal: string;
  experience: string;
  selfAssessment: string;
}): Promise<AiResult<DiagnosticPlan>> {
  if (!process.env.OPENAI_API_KEY) return { data: demoDiagnostic(input), source: "demo" };
  const data = await runStructured("german_diagnostic_plan", diagnosticPlanJsonSchema, "You place German learners and create first-week plans from goals and self-assessment.", input);
  return { data: diagnosticPlanSchema.parse(JSON.parse(extractOutputText(data))), source: "openai" };
}

export async function generateProgressReport(input: {
  currentGoal: string;
  recentPractice: string;
  concerns: string;
}): Promise<AiResult<ProgressReport>> {
  if (!process.env.OPENAI_API_KEY) return { data: demoProgress(input), source: "demo" };
  const data = await runStructured("german_progress_report", progressReportJsonSchema, "You create learner progress reports with readiness scoring and next actions.", input);
  return { data: progressReportSchema.parse(JSON.parse(extractOutputText(data))), source: "openai" };
}

async function runStructured(schemaName: string, schema: object, system: string, input: object) {
  const response = await fetch(responsesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FEEDBACK_MODEL || "gpt-5.4-mini",
      input: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Return structured, practical German learning output. Explanations should be English; examples/prompts should be German where relevant.",
            ...input,
          }),
        },
      ],
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
    }),
  });
  const data: unknown = await response.json();
  if (!response.ok) throw new Error(getOpenAIErrorMessage(data));
  return data;
}

function demoWeakSpot(input: { level: string; weakArea: string; context: string }): WeakSpotPlan {
  return {
    title: `${input.level} ${input.weakArea} rescue plan`,
    level: input.level,
    diagnosis: `Demo plan for ${input.weakArea}. Add OpenAI for live personalization.`,
    drills: [
      {
        title: "Sentence rebuild",
        type: "grammar",
        prompt: "Rebuild: ich / gestern / dem Kunden / geholfen / habe",
        modelAnswer: "Ich habe gestern dem Kunden geholfen.",
        explanation: "The finite verb stays in position two; the participle goes to the end.",
      },
    ],
    speakingPrompt: "Erzaehlen Sie in drei Saetzen, wobei Sie gestern jemandem geholfen haben.",
    reviewChecklist: ["Verb in position two", "Correct article", "One complete spoken sentence"],
    nextActions: ["Repeat the model answer aloud", "Do one roleplay in Speaking Lab"],
    weakTags: [input.weakArea.toLowerCase().replace(/\s+/g, "-")],
  };
}

function demoExam(input: { level: string; examType: string; focus: string }): ExamPractice {
  return {
    title: `${input.examType} ${input.level} practice`,
    examType: input.examType,
    level: input.level,
    sections: [
      {
        name: "Speaking",
        timingMinutes: 5,
        task: input.focus,
        instructions: "Answer clearly in German and give one reason.",
        questions: [
          {
            prompt: "Was lernen Sie lieber: online oder im Kurs?",
            expectedAnswer: "Ich lerne lieber online, weil ich flexibel bleiben kann.",
            skill: "opinion + reason",
          },
        ],
      },
    ],
    speakingPrompt: "Sprechen Sie eine Minute ueber Ihr Lernziel.",
    writingPrompt: "Schreiben Sie eine kurze E-Mail und bitten Sie um Informationen.",
    scoringRubric: ["Task completion", "Grammar", "Vocabulary", "Fluency"],
    readinessAdvice: ["Practice timing", "Use connectors", "Review common phrases"],
  };
}

function demoDiagnostic(input: { goal: string; experience: string; selfAssessment: string }): DiagnosticPlan {
  return {
    estimatedLevel: "A2",
    goalSummary: input.goal || "Build practical German.",
    skillScores: [
      { skill: "Speaking", score: 58, reason: "Needs more full-sentence practice." },
      { skill: "Grammar", score: 52, reason: "Likely case and word-order gaps." },
    ],
    weakTags: ["verb-position", "fluency", "articles"],
    recommendedStart: "Start with A2 speaking and grammar rescue lessons.",
    firstWeekPlan: ["Day 1: diagnostic speaking", "Day 2: verb position", "Day 3: roleplay"],
    placementTasks: ["Introduce yourself", "Write a short email", "Answer one opinion question"],
  };
}

function demoProgress(input: { currentGoal: string; recentPractice: string; concerns: string }): ProgressReport {
  return {
    summary: `Demo progress report for: ${input.currentGoal || "German learning"}.`,
    readinessScore: 67,
    estimatedLevel: "A2",
    skillScores: [
      { skill: "Speaking", score: 62, trend: "up", action: "Repeat corrected answers aloud." },
      { skill: "Grammar", score: 55, trend: "flat", action: "Drill cases in short sentences." },
    ],
    wins: ["You are practicing consistently."],
    risks: ["Weak grammar may slow speaking confidence."],
    nextActions: ["Generate one weak-spot plan", "Do one interview or speaking mock"],
  };
}

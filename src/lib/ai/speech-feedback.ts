import "server-only";

import {
  speechFeedbackJsonSchema,
  speechFeedbackSchema,
  type SpeechFeedback,
} from "@/lib/ai/schemas";
import {
  extractOutputText,
  getOpenAIErrorMessage,
  responsesUrl,
} from "@/lib/ai/response-utils";

export type SpeechFeedbackRequest = {
  transcript: string;
  mode: string;
  level: string;
  taskTitle: string;
  taskPrompt: string;
  target?: string;
  conversationTranscript?: string;
  acousticObservations?: string;
};

type SpeechFeedbackResult = {
  feedback: SpeechFeedback;
  source: "openai" | "demo";
};

export function createDemoFeedback(input: SpeechFeedbackRequest): SpeechFeedback {
  const transcript = input.transcript.trim() || "No transcript captured yet.";

  return {
    whatLearnerSaid: transcript,
    correctedGerman:
      input.target ||
      "Ich moechte das noch einmal langsam und deutlich auf Deutsch sagen.",
    englishExplanation:
      "Demo feedback is active because OPENAI_API_KEY is not configured. Once the key is set, this panel will return detailed AI corrections from the learner audio or transcript.",
    pronunciationIssues: [
      "Check long and short vowel length.",
      "Keep final consonants clear, especially -ch, -ig, and -en.",
    ],
    grammarMistakes: [
      {
        issue: "Verb position",
        correction: "Put the conjugated verb in position two in main clauses.",
        explanation: "German main clauses usually place the finite verb after the first idea.",
      },
    ],
    vocabularyAlternatives: [
      {
        original: "gut",
        better: "passend / hilfreich / ueberzeugend",
        reason: "A precise adjective sounds stronger at B1 and above.",
      },
    ],
    fluencyScore: 62,
    taskCompletionScore: 70,
    cefrLevel: input.level === "C1" || input.level === "C2" ? "B2" : "A2",
    strengths: ["You attempted the task.", "The message is understandable."],
    retryPrompt:
      input.target ||
      "Repeat this sentence: Ich spreche jeden Tag ein bisschen Deutsch, damit ich sicherer werde.",
    nextDrill: "Repeat the corrected version twice: once slowly, once at natural speed.",
    weakTags: ["verb-position", "pronunciation", "fluency"],
  };
}

export async function generateSpeechFeedback(
  input: SpeechFeedbackRequest,
): Promise<SpeechFeedbackResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      feedback: createDemoFeedback(input),
      source: "demo",
    };
  }

  const response = await fetch(responsesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FEEDBACK_MODEL || "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content:
            "You are an encouraging German speaking assessor. Practice comes first: reward successful communication, identify the few highest-value improvements, and avoid overwhelming the learner. Return only valid structured feedback. Do not claim official exam grading.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction: buildFeedbackInstruction(input),
            ...input,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "german_speech_feedback",
          strict: true,
          schema: speechFeedbackJsonSchema,
        },
      },
    }),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getOpenAIErrorMessage(data));
  }

  const outputText = extractOutputText(data);
  const parsedJson = JSON.parse(outputText) as unknown;
  const parsed = speechFeedbackSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new Error("OpenAI feedback did not match the expected schema.");
  }

  return {
    feedback: parsed.data,
    source: "openai",
  };
}

function buildFeedbackInstruction(input: SpeechFeedbackRequest) {
  const basis = input.acousticObservations
    ? "Use the transcript for language accuracy and the supplied acoustic observations for audible pronunciation, rhythm, pacing, pauses, stress, clarity, and confidence. Do not invent phoneme measurements."
    : "Pronunciation notes are transcript-based practice suggestions only; do not claim acoustic analysis.";
  const modeGuidance: Record<string, string> = {
    pronunciation:
      "Prioritize intelligibility, delivery, and a short useful retry. Do not turn this into a long grammar lesson.",
    roleplay:
      "Assess whether the learner communicated naturally and achieved the roleplay goal. Minor mistakes should not outweigh successful communication.",
    exam:
      "Assess structure, relevance, supporting reasons, examples, connectors, and sustained speaking. Suggest vocabulary that would strengthen a retake.",
    "weak-spot":
      "Focus on whether the target form was used successfully in original spoken sentences.",
    shadow:
      "Compare the spoken delivery with the target passage. Prioritize sustained rhythm, phrasing, stress, clarity, and completion.",
  };

  return [
    basis,
    modeGuidance[input.mode] || "Assess practical spoken communication.",
    "Focus on grammar, vocabulary, sentence structure, fluency, task completion, and CEFR estimate.",
    "Give only the few highest-value corrections. Keep explanations in English and examples in German.",
  ].join(" ");
}

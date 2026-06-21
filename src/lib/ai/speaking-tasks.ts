import "server-only";

import {
  generatedSpeakingTaskJsonSchema,
  generatedSpeakingTaskSchema,
  speakingTaskLevelSchema,
  speakingTaskModeSchema,
  type SpeakingPracticeTask,
} from "@/lib/speaking-task-model";
import {
  extractOutputText,
  getOpenAIErrorMessage,
  responsesUrl,
} from "@/lib/ai/response-utils";

export async function generateSpeakingTask(input: {
  mode: string;
  level: string;
  existingTitles?: string[];
}): Promise<{ task: SpeakingPracticeTask; source: "openai" | "demo" }> {
  const mode = speakingTaskModeSchema.parse(input.mode);
  const level = speakingTaskLevelSchema.parse(input.level);
  const existingTitles = (input.existingTitles || [])
    .filter((title) => typeof title === "string")
    .map((title) => title.trim())
    .filter(Boolean)
    .slice(0, 30);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      task: createDemoTask(mode, level),
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
            "You design practical CEFR-aligned German speaking tasks. Return only the requested structured task.",
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction: generationInstruction(mode),
            mode,
            level,
            avoidTitles: existingTitles,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "german_speaking_task",
          strict: true,
          schema: generatedSpeakingTaskJsonSchema,
        },
      },
    }),
  });
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getOpenAIErrorMessage(data));
  }

  const generated = generatedSpeakingTaskSchema.parse(
    JSON.parse(extractOutputText(data)),
  );
  const target = generated.target?.trim() || "";

  if (mode === "shadow" && (target.length < 850 || target.length > 1400)) {
    throw new Error(
      "Generated shadow passage must contain roughly 850 to 1,400 characters.",
    );
  }

  if (mode === "pronunciation" && !target) {
    throw new Error("Generated pronunciation practice must include target text.");
  }

  return {
    task: {
      ...generated,
      mode,
      level,
      id: crypto.randomUUID(),
      source: "generated",
    },
    source: "openai",
  };
}

function generationInstruction(mode: SpeakingPracticeTask["mode"]) {
  const instructions: Record<SpeakingPracticeTask["mode"], string> = {
    pronunciation:
      "Create fresh German pronunciation practice with a useful 2-5 sentence target text. It should expose level-appropriate sounds, rhythm, and word stress.",
    roleplay:
      "Create a realistic roleplay scenario with one concrete learner objective. The prompt must explain the learner role, AI role, setting, and 2-4 goals. Do not include corrections in the prompt.",
    exam:
      "Create one exam-style speaking topic that supports 60-180 seconds of uninterrupted German. Ask for a clear structure, reasons, and examples without claiming official exam status.",
    "weak-spot":
      "Create a focused spoken drill around one common grammar or vocabulary weakness. It should require several original complete sentences, not mechanical repetition.",
    shadow:
      "Create one coherent natural German passage of roughly 900-1200 characters for shadowing. The target must be a continuous passage, not a list. Match the CEFR level.",
  };
  return instructions[mode];
}

function createDemoTask(
  mode: SpeakingPracticeTask["mode"],
  level: SpeakingPracticeTask["level"],
): SpeakingPracticeTask {
  const samples: Record<SpeakingPracticeTask["mode"], Omit<SpeakingPracticeTask, "id" | "mode" | "level" | "source">> = {
    pronunciation: {
      title: "Morning plans",
      prompt: "Read the model text clearly and keep the sentence rhythm natural.",
      target:
        "Heute Morgen stehe ich früh auf, frühstücke in Ruhe und fahre danach mit dem Fahrrad zur Arbeit.",
      successCriteria: ["Clear vowel length", "Natural stress", "Steady pace"],
    },
    roleplay: {
      title: "Change a doctor appointment",
      prompt:
        "You are calling a clinic. Explain that you cannot attend tomorrow, request a new appointment, and confirm the date and time.",
      successCriteria: ["Explain the problem", "Request a new time", "Confirm details"],
    },
    exam: {
      title: "Living without a car",
      prompt:
        "Speak about whether life without a private car is realistic. Give your opinion, two reasons, one example, and a short conclusion.",
      successCriteria: ["Clear opinion", "Two reasons", "Logical conclusion"],
    },
    "weak-spot": {
      title: "Because and although",
      prompt:
        "Describe three choices you made recently. Use weil in two sentences and obwohl in one sentence.",
      successCriteria: ["Verb-final clauses", "Complete ideas", "Natural connectors"],
    },
    shadow: {
      title: "A busy day in the city",
      prompt:
        "Read the full passage naturally. Keep going through small mistakes; the AI will analyze after you finish.",
      target:
        "Am Samstagmorgen war die Innenstadt schon früh voller Menschen. Vor dem Bahnhof warteten Reisende mit großen Koffern, während auf dem Marktplatz Händler ihre Stände vorbereiteten. Ich wollte eigentlich nur schnell ein Geschenk kaufen, doch dann traf ich zufällig eine alte Freundin. Wir setzten uns in ein kleines Café, bestellten Tee und erzählten uns, was in den letzten Monaten passiert war. Später gingen wir gemeinsam durch die Fußgängerzone. Ein Straßenmusiker spielte bekannte Lieder, Kinder tanzten vor ihm, und viele Passanten blieben für einen Moment stehen. Obwohl ich meinen ursprünglichen Plan fast vergessen hatte, fand ich am Ende noch ein passendes Geschenk. Auf dem Heimweg dachte ich darüber nach, wie oft die besten Tage anders verlaufen als erwartet. Man beginnt mit einer einfachen Aufgabe und kehrt mit neuen Geschichten, Begegnungen und Ideen zurück.",
      successCriteria: ["Complete passage", "Natural phrasing", "Consistent rhythm"],
    },
  };

  return {
    id: crypto.randomUUID(),
    mode,
    level,
    source: "generated",
    ...samples[mode],
  };
}

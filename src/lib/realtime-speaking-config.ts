import type { SpeakingMode } from "@/lib/curriculum";

export type SpeakingModeBehavior = {
  aiSpeaks: boolean;
  manualTurnSubmit: boolean;
  uninterrupted: boolean;
  startLabel: string;
  stopLabel: string;
};

export function getSpeakingModeBehavior(
  mode: string,
): SpeakingModeBehavior {
  if (mode === "roleplay") {
    return {
      aiSpeaks: true,
      manualTurnSubmit: true,
      uninterrupted: false,
      startLabel: "Start roleplay",
      stopLabel: "End and analyze",
    };
  }

  return {
    aiSpeaks: false,
    manualTurnSubmit: false,
    uninterrupted: true,
    startLabel: mode === "exam" ? "Start topic attempt" : "Start uninterrupted attempt",
    stopLabel: "I'm finished — analyze",
  };
}

export function buildRealtimeSpeakingSession(input: {
  mode: string;
  level: string;
  taskTitle: string;
  taskPrompt: string;
  model: string;
  voice: string;
  transcriptionModel: string;
}) {
  const behavior = getSpeakingModeBehavior(input.mode);
  const mode = normalizeMode(input.mode);

  return {
    session: {
      type: "realtime",
      model: input.model,
      output_modalities: ["audio"],
      instructions: buildInstructions({
        mode,
        level: input.level,
        taskTitle: input.taskTitle,
        taskPrompt: input.taskPrompt,
      }),
      audio: {
        input: {
          noise_reduction: { type: "near_field" },
          transcription: {
            model: input.transcriptionModel,
            language: "de",
            prompt:
              "German learner speech. Preserve German words, hesitations, self-corrections, and learner mistakes.",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.45,
            prefix_padding_ms: 300,
            silence_duration_ms: behavior.uninterrupted ? 1800 : 1000,
            create_response: false,
            interrupt_response: false,
          },
        },
        output: {
          voice: input.voice,
        },
      },
      include: ["item.input_audio_transcription.logprobs"],
    },
  };
}

function buildInstructions(input: {
  mode: SpeakingMode;
  level: string;
  taskTitle: string;
  taskPrompt: string;
}) {
  const common = [
    "# Role",
    "You are DeutschPilot AI, a natural German speaking practice partner.",
    `Target CEFR: ${input.level}.`,
    `Task: ${input.taskTitle}. ${input.taskPrompt}`,
    "# Global rules",
    "- Keep German natural and level-appropriate.",
    "- Never correct the learner during the live attempt.",
    "- Detailed teaching and scoring happen only after the learner requests analysis.",
  ];

  if (input.mode === "roleplay") {
    return [
      ...common,
      "# Roleplay behavior",
      "- Speak only after the client explicitly requests your next turn.",
      "- Reply like a human conversation partner in one or two short sentences.",
      "- Ask at most one useful follow-up question.",
      "- Do not lecture, score, or list corrections.",
      "- Move the scenario toward its stated goal and finish within 3 to 6 learner turns.",
      '- When the learner has achieved the task, say exactly: "Die Aufgabe ist abgeschlossen. Klicke jetzt auf Analysieren."',
    ].join("\n");
  }

  return [
    ...common,
    "# Silent assessment behavior",
    "- Do not generate spoken or text replies during this attempt.",
    "- The learner controls when the attempt ends.",
    "- Pauses are allowed and must not be treated as a request for assistance.",
  ].join("\n");
}

function normalizeMode(mode: string): SpeakingMode {
  return ["pronunciation", "roleplay", "exam", "weak-spot", "shadow"].includes(mode)
    ? (mode as SpeakingMode)
    : "pronunciation";
}

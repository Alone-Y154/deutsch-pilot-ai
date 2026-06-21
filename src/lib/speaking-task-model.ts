import { z } from "zod";

export const speakingTaskModeSchema = z.enum([
  "pronunciation",
  "roleplay",
  "exam",
  "weak-spot",
  "shadow",
]);

export const speakingTaskLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

export const speakingPracticeTaskSchema = z.object({
  id: z.string().min(1),
  mode: speakingTaskModeSchema,
  level: speakingTaskLevelSchema,
  title: z.string().min(2).max(100),
  prompt: z.string().min(5).max(5000),
  target: z.string().max(5000).optional(),
  successCriteria: z.array(z.string().min(2).max(120)).min(2).max(6),
  source: z.enum(["built-in", "generated", "custom"]),
});

export type SpeakingPracticeTask = z.infer<typeof speakingPracticeTaskSchema>;

export const generatedSpeakingTaskSchema = speakingPracticeTaskSchema
  .omit({ id: true, source: true })
  .extend({
    title: z.string().min(2).max(100),
    prompt: z.string().min(10).max(5000),
  });

export const generatedSpeakingTaskJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mode", "level", "title", "prompt", "target", "successCriteria"],
  properties: {
    mode: {
      type: "string",
      enum: ["pronunciation", "roleplay", "exam", "weak-spot", "shadow"],
    },
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    title: { type: "string" },
    prompt: { type: "string" },
    target: { type: "string" },
    successCriteria: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
  },
} as const;

export function createCustomSpeakingTask(input: {
  mode: string;
  level: string;
  title?: string;
  text: string;
  id?: string;
}): SpeakingPracticeTask {
  const mode = speakingTaskModeSchema.parse(input.mode);
  const level = speakingTaskLevelSchema.parse(input.level);
  const text = input.text.trim();

  if (text.length < 5 || text.length > 5000) {
    throw new Error("Custom speaking text must contain 5 to 5,000 characters.");
  }

  const isReadingMode = mode === "pronunciation" || mode === "shadow";

  return speakingPracticeTaskSchema.parse({
    id: input.id || crypto.randomUUID(),
    mode,
    level,
    title: input.title?.trim() || defaultCustomTitle(mode),
    prompt: isReadingMode
      ? mode === "shadow"
        ? "Read the passage naturally from beginning to end. The AI will not interrupt."
        : "Read the German text clearly, at a comfortable pace, without interruption."
      : text,
    target: isReadingMode ? text : undefined,
    successCriteria: criteriaForMode(mode),
    source: "custom",
  });
}

function defaultCustomTitle(mode: SpeakingPracticeTask["mode"]) {
  const titles: Record<SpeakingPracticeTask["mode"], string> = {
    pronunciation: "My pronunciation text",
    roleplay: "My conversation scenario",
    exam: "My speaking topic",
    "weak-spot": "My focused speaking drill",
    shadow: "My shadowing passage",
  };
  return titles[mode];
}

function criteriaForMode(mode: SpeakingPracticeTask["mode"]) {
  const criteria: Record<SpeakingPracticeTask["mode"], string[]> = {
    pronunciation: ["Clear sounds", "Natural word stress", "Steady pace"],
    roleplay: ["Complete the goal", "Respond naturally", "Use appropriate vocabulary"],
    exam: ["Clear structure", "Relevant ideas", "Natural connectors"],
    "weak-spot": ["Use the target form", "Self-correct calmly", "Finish complete sentences"],
    shadow: ["Match rhythm", "Keep phrasing smooth", "Finish the full passage"],
  };
  return criteria[mode];
}

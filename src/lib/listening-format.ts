import type {
  ListeningAudioScriptSegment,
  ListeningExercise,
  ListeningFormat,
} from "@/lib/ai/listening-schemas";

export const listeningFormatOptions: Array<{
  value: ListeningFormat;
  label: string;
  description: string;
  realism: string;
}> = [
  {
    value: "dialogue",
    label: "Dialog",
    description: "Natürliches Gespräch mit zwei oder drei Personen",
    realism: "Mehrere Stimmen, echte Sprecherwechsel und kurze Reaktionen",
  },
  {
    value: "announcement",
    label: "Durchsage",
    description: "Bahnhof, Flughafen, Veranstaltung oder öffentliche Information",
    realism: "Eine klare Ansagestimme mit realistischen Wiederholungen und Details",
  },
  {
    value: "interview",
    label: "Interview",
    description: "Moderator und Gast im Wechsel",
    realism: "Getrennte Stimmen für Fragen, Antworten und natürliche Rückfragen",
  },
  {
    value: "story",
    label: "Geschichte",
    description: "Erzählung mit zeitlicher Reihenfolge und Details",
    realism: "Ruhige Erzählerstimme und passende emotionale Sprechweise",
  },
  {
    value: "news",
    label: "Nachrichten",
    description: "Nachrichtenmeldung, Reportage oder Studiogespräch",
    realism: "Professioneller Nachrichtenton mit Moderator und optionalem Reporter",
  },
];

export const listeningTopicSuggestions: Record<ListeningFormat, string[]> = {
  dialogue: [
    "Einen Arzttermin verschieben",
    "Eine falsche Bestellung im Café",
    "Eine Wohnung besichtigen",
    "Ein Problem im Hotel lösen",
    "Mit einem Kollegen einen Termin planen",
  ],
  announcement: [
    "Verspätung und Gleiswechsel am Bahnhof",
    "Änderung im Veranstaltungsprogramm",
    "Flughafendurchsage zu einem Gate-Wechsel",
    "Informationen im Schwimmbad",
    "Öffentliche Warnung wegen Unwetter",
  ],
  interview: [
    "Ein Bewerbungsgespräch",
    "Interview mit einer Studentin im Ausland",
    "Gespräch mit einem Gründer",
    "Radiointerview über nachhaltiges Reisen",
    "Interview mit einer Ärztin über Schlaf",
  ],
  story: [
    "Ein unerwarteter Tag in einer neuen Stadt",
    "Eine Reise, die anders verlief als geplant",
    "Der erste Tag in einem neuen Job",
    "Eine verlorene Tasche und ihre Rückkehr",
    "Ein besonderes Wochenende mit Freunden",
  ],
  news: [
    "Neue Fahrradwege in einer Großstadt",
    "Veränderungen im öffentlichen Nahverkehr",
    "Ein lokales Kulturfestival",
    "Neue Regeln für mobiles Arbeiten",
    "Ein Umweltprojekt an einer Universität",
  ],
};

export const freshTopicValue = "__generate_fresh_topic__";
export const customTopicValue = "__custom_topic__";

const ttsVoices = ["marin", "cedar", "coral", "verse", "sage", "ash"] as const;

export function formatDetails(format: ListeningFormat) {
  return (
    listeningFormatOptions.find((item) => item.value === format) ||
    listeningFormatOptions[0]
  );
}

export function topicRequestValue(
  selectedTopic: string,
  customTopic: string,
  format: ListeningFormat,
) {
  if (selectedTopic === freshTopicValue) {
    return `Erfinde ein neues realistisches Thema für das Format ${formatDetails(format).label}.`;
  }

  if (selectedTopic === customTopicValue) {
    return customTopic.trim();
  }

  return selectedTopic.trim();
}

export function assignVoicesToScript(script: ListeningAudioScriptSegment[]) {
  const speakerVoices = new Map<string, (typeof ttsVoices)[number]>();

  return script.map((segment) => {
    if (!speakerVoices.has(segment.speaker)) {
      speakerVoices.set(
        segment.speaker,
        ttsVoices[speakerVoices.size % ttsVoices.length],
      );
    }

    return {
      ...segment,
      voice: speakerVoices.get(segment.speaker)!,
    };
  });
}

export function buildGermanTranscript(script: ListeningAudioScriptSegment[]) {
  return script
    .map((segment) => `${segment.speaker}: ${segment.text.trim()}`)
    .join("\n");
}

export function validateListeningExerciseContent(exercise: ListeningExercise) {
  const speakers = new Set(exercise.audioScript.map((segment) => segment.speaker));
  const constraints: Record<
    ListeningFormat,
    { minSpeakers: number; maxSpeakers: number; minSegments: number }
  > = {
    dialogue: { minSpeakers: 2, maxSpeakers: 3, minSegments: 6 },
    announcement: { minSpeakers: 1, maxSpeakers: 1, minSegments: 1 },
    interview: { minSpeakers: 2, maxSpeakers: 2, minSegments: 6 },
    story: { minSpeakers: 1, maxSpeakers: 3, minSegments: 2 },
    news: { minSpeakers: 1, maxSpeakers: 3, minSegments: 2 },
  };
  const constraint = constraints[exercise.format];

  if (
    speakers.size < constraint.minSpeakers ||
    speakers.size > constraint.maxSpeakers
  ) {
    throw new Error(
      `${exercise.format} requires ${constraint.minSpeakers}-${constraint.maxSpeakers} distinct speakers.`,
    );
  }

  if (exercise.audioScript.length < constraint.minSegments) {
    throw new Error(
      `${exercise.format} requires at least ${constraint.minSegments} audio segments.`,
    );
  }

  const germanFields = [
    ...exercise.audioScript.map((segment) => segment.text),
    ...exercise.questions.flatMap((question) => [
      question.prompt,
      ...question.options,
      question.correctOption,
      question.explanation,
    ]),
  ];

  for (const field of germanFields) {
    if (!isLikelyGerman(field)) {
      throw new Error(
        `Listening scripts, questions, options, and explanations must be German. Invalid text: ${field.slice(0, 120)}`,
      );
    }
  }

  for (const question of exercise.questions) {
    if (!question.options.includes(question.correctOption)) {
      throw new Error("Every correct listening answer must match one supplied option.");
    }
  }

  return {
    ...exercise,
    transcriptGerman: buildGermanTranscript(exercise.audioScript),
  };
}

export function isLikelyGerman(text: string) {
  const tokens = text
    .toLocaleLowerCase("de-DE")
    .replace(/[^\p{L}äöüß]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return false;

  const germanWords = new Set([
    "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen",
    "einer", "ist", "sind", "war", "waren", "wird", "werden", "hat", "haben",
    "ich", "du", "er", "sie", "wir", "ihr", "und", "oder", "aber", "weil",
    "dass", "wenn", "wie", "was", "warum", "wann", "wo", "welche", "welcher",
    "mit", "für", "von", "zu", "an", "am", "im", "auf", "aus", "nach", "bei", "nicht",
    "noch", "bitte", "heute", "morgen", "montag", "dienstag", "mittwoch",
    "donnerstag", "freitag", "samstag", "sonntag", "möchte", "kann", "können",
    "muss", "müssen", "geht", "gibt", "mehr", "weniger", "zuerst", "danach",
  ]);
  const englishWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "will", "has", "have",
    "i", "you", "he", "she", "we", "they", "and", "or", "but", "because",
    "that", "when", "how", "what", "why", "where", "which", "with", "for",
    "from", "to", "at", "in", "on", "not", "please", "today", "tomorrow",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "sunday", "would", "can", "must", "first", "then", "answer", "question",
    "hello", "world", "this", "these", "those", "there", "here", "my", "your",
    "our", "their", "it", "its", "do", "does", "did", "could", "should",
    "may", "might", "want", "need", "work", "job", "interview", "customer",
    "travel", "train", "station", "story", "news", "person", "people", "time",
    "day",
  ]);
  const germanScore = tokens.filter((token) => germanWords.has(token)).length;
  const englishScore = tokens.filter(
    (token) => englishWords.has(token) && !germanWords.has(token),
  ).length;
  const hasGermanCharacters = /[äöüß]/i.test(text);

  if (englishScore > germanScore && englishScore >= 1) return false;
  return germanScore > 0 || hasGermanCharacters || englishScore === 0;
}

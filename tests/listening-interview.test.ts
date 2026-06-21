import assert from "node:assert/strict";
import test from "node:test";

import {
  assignVoicesToScript,
  buildGermanTranscript,
  freshTopicValue,
  isLikelyGerman,
  listeningTopicSuggestions,
  topicRequestValue,
  validateListeningExerciseContent,
} from "../src/lib/listening-format.ts";
import type { ListeningExercise } from "../src/lib/ai/listening-schemas.ts";

test("format changes expose matching topic suggestions and on-demand generation", () => {
  assert.match(listeningTopicSuggestions.announcement[0], /Bahnhof|Durchsage|Flughafen/);
  assert.match(
    topicRequestValue(freshTopicValue, "", "interview"),
    /neues realistisches Thema/,
  );
});

test("distinct speakers receive distinct persistent TTS voices", () => {
  const voiced = assignVoicesToScript([
    { speaker: "Anna", role: "Kundin", text: "Guten Tag." },
    { speaker: "Tom", role: "Mitarbeiter", text: "Wie kann ich helfen?" },
    { speaker: "Anna", role: "Kundin", text: "Ich habe eine Frage." },
  ]);
  assert.notEqual(voiced[0].voice, voiced[1].voice);
  assert.equal(voiced[0].voice, voiced[2].voice);
});

test("German-only validation rejects English questions and single-reader dialogue", () => {
  const base: ListeningExercise = {
    title: "Termin",
    level: "A2",
    topic: "Arzttermin",
    format: "dialogue",
    situation: "Ein Telefongespräch.",
    instructions: "Hören Sie zu.",
    transcriptGerman: "",
    audioScript: [
      { speaker: "Anna", role: "Patientin", text: "Guten Tag, ich brauche einen Termin." },
      { speaker: "Anna", role: "Patientin", text: "Am Montag habe ich Zeit." },
      { speaker: "Anna", role: "Patientin", text: "Vielen Dank." },
      { speaker: "Anna", role: "Patientin", text: "Auf Wiederhören." },
      { speaker: "Anna", role: "Patientin", text: "Das passt gut." },
      { speaker: "Anna", role: "Patientin", text: "Bis Montag." },
    ],
    durationEstimateSeconds: 40,
    questions: [
      {
        id: "q1",
        skill: "detail",
        prompt: "When is the appointment?",
        options: ["Am Montag", "Am Dienstag", "Am Freitag"],
        correctOption: "Am Montag",
        explanation: "Anna nennt Montag.",
      },
      {
        id: "q2",
        skill: "main-idea",
        prompt: "Warum ruft Anna an?",
        options: ["Sie braucht einen Termin.", "Sie bestellt Essen.", "Sie kauft ein Ticket."],
        correctOption: "Sie braucht einen Termin.",
        explanation: "Sie möchte einen Termin vereinbaren.",
      },
      {
        id: "q3",
        skill: "detail",
        prompt: "Wann hat Anna Zeit?",
        options: ["Am Montag", "Am Abend", "Im Winter"],
        correctOption: "Am Montag",
        explanation: "Anna sagt ausdrücklich Montag.",
      },
    ],
    vocabularyAfterAnswer: [],
  };

  assert.throws(() => validateListeningExerciseContent(base), /requires 2-3/);
  assert.equal(isLikelyGerman("When is the appointment?"), false);
  assert.equal(isLikelyGerman("Hello world, this is the news."), false);
  assert.equal(isLikelyGerman("Wann ist der Termin?"), true);
});

test("German transcript is derived from the exact spoken script", () => {
  assert.equal(
    buildGermanTranscript([
      { speaker: "Moderatorin", role: "Moderatorin", text: "Willkommen." },
      { speaker: "Gast", role: "Gast", text: "Vielen Dank." },
    ]),
    "Moderatorin: Willkommen.\nGast: Vielen Dank.",
  );
});

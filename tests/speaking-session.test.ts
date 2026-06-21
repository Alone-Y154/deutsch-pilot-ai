import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTranscriptUpdate,
  compareAttemptScores,
  conversationTranscript,
  learnerTranscript,
  readRealtimeTranscriptUpdate,
  roleplayIsComplete,
  setTurnTranslation,
} from "../src/lib/speaking-session.ts";
import { createCustomSpeakingTask } from "../src/lib/speaking-task-model.ts";
import {
  buildRealtimeSpeakingSession,
  getSpeakingModeBehavior,
} from "../src/lib/realtime-speaking-config.ts";
import { encodeMonoWav } from "../src/lib/audio-recording.ts";
import { speakingTasks } from "../src/lib/curriculum.ts";

test("builds separate user and assistant transcript turns from realtime events", () => {
  const userDelta = readRealtimeTranscriptUpdate({
    type: "conversation.item.input_audio_transcription.delta",
    item_id: "user-1",
    delta: "Guten ",
  });
  const userDone = readRealtimeTranscriptUpdate({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "user-1",
    transcript: "Guten Tag.",
  });
  const assistantDone = readRealtimeTranscriptUpdate({
    type: "response.output_audio_transcript.done",
    item_id: "assistant-1",
    transcript: "Wie kann ich Ihnen helfen?",
  });

  assert.ok(userDelta);
  assert.ok(userDone);
  assert.ok(assistantDone);

  let turns = applyTranscriptUpdate([], userDelta);
  turns = applyTranscriptUpdate(turns, userDone);
  turns = applyTranscriptUpdate(turns, assistantDone);

  assert.deepEqual(
    turns.map(({ role, german, complete }) => ({ role, german, complete })),
    [
      { role: "user", german: "Guten Tag.", complete: true },
      {
        role: "assistant",
        german: "Wie kann ich Ihnen helfen?",
        complete: true,
      },
    ],
  );
  assert.equal(learnerTranscript(turns), "Guten Tag.");
  assert.equal(
    conversationTranscript(turns),
    "User: Guten Tag.\nAI: Wie kann ich Ihnen helfen?",
  );
});

test("stores English translation beside the matching German turn", () => {
  const update = readRealtimeTranscriptUpdate({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: "user-2",
    transcript: "Ich brauche einen Termin.",
  });
  assert.ok(update);

  const turns = setTurnTranslation(
    applyTranscriptUpdate([], update),
    "user-2",
    "I need an appointment.",
  );

  assert.equal(turns[0].english, "I need an appointment.");
  assert.equal(turns[0].translationStatus, "ready");
});

test("creates persisted-ready custom tasks for reading and open speaking modes", () => {
  const pronunciation = createCustomSpeakingTask({
    id: "custom-pronunciation",
    mode: "pronunciation",
    level: "A2",
    text: "Heute übe ich meine Aussprache mit einem eigenen Text.",
  });
  const exam = createCustomSpeakingTask({
    id: "custom-exam",
    mode: "exam",
    level: "B1",
    title: "My topic",
    text: "Sprechen Sie darüber, ob flexible Arbeitszeiten hilfreich sind.",
  });

  assert.equal(pronunciation.target, "Heute übe ich meine Aussprache mit einem eigenen Text.");
  assert.match(pronunciation.prompt, /Read the German text/);
  assert.equal(exam.target, undefined);
  assert.equal(exam.prompt, "Sprechen Sie darüber, ob flexible Arbeitszeiten hilfreich sind.");
  assert.equal(exam.title, "My topic");
});

test("disables automatic AI responses for uninterrupted speaking modes", () => {
  for (const mode of ["pronunciation", "exam", "weak-spot", "shadow"]) {
    const behavior = getSpeakingModeBehavior(mode);
    const config = buildRealtimeSpeakingSession({
      mode,
      level: "B1",
      taskTitle: "Test task",
      taskPrompt: "Speak for one minute.",
      model: "gpt-realtime",
      voice: "marin",
      transcriptionModel: "gpt-4o-transcribe",
    });

    assert.equal(behavior.aiSpeaks, false);
    assert.equal(behavior.uninterrupted, true);
    assert.equal(
      config.session.audio.input.turn_detection.create_response,
      false,
    );
    assert.equal(
      config.session.audio.input.turn_detection.interrupt_response,
      false,
    );
    assert.match(config.session.instructions, /Do not generate spoken or text replies/);
  }
});

test("roleplay waits for explicit turns and locks after completion", () => {
  const behavior = getSpeakingModeBehavior("roleplay");
  const config = buildRealtimeSpeakingSession({
    mode: "roleplay",
    level: "A2",
    taskTitle: "Cafe",
    taskPrompt: "Order and ask for the bill.",
    model: "gpt-realtime",
    voice: "marin",
    transcriptionModel: "gpt-4o-transcribe",
  });

  assert.equal(behavior.aiSpeaks, true);
  assert.equal(behavior.manualTurnSubmit, true);
  assert.equal(config.session.audio.input.turn_detection.create_response, false);
  assert.match(
    config.session.instructions,
    /Speak only after the client explicitly requests/,
  );
  assert.equal(
    roleplayIsComplete(
      [
        {
          id: "ai-final",
          role: "assistant",
          german: "Die Aufgabe ist abgeschlossen. Klicke jetzt auf Analysieren.",
          english: "",
          translationStatus: "loading",
          complete: true,
        },
      ],
      3,
    ),
    true,
  );
  assert.equal(roleplayIsComplete([], 6), true);
});

test("encodes browser microphone samples as a valid mono WAV file", () => {
  const wav = encodeMonoWav(new Float32Array([0, 0.5, -0.5]), 16_000);
  const view = new DataView(wav);
  const text = (offset: number, length: number) =>
    Array.from({ length }, (_, index) =>
      String.fromCharCode(view.getUint8(offset + index)),
    ).join("");

  assert.equal(text(0, 4), "RIFF");
  assert.equal(text(8, 4), "WAVE");
  assert.equal(text(36, 4), "data");
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(wav.byteLength, 50);
});

test("compares a retake without changing persistence semantics", () => {
  assert.deepEqual(
    compareAttemptScores(
      { fluencyScore: 58, taskCompletionScore: 64 },
      { fluencyScore: 71, taskCompletionScore: 82 },
    ),
    {
      previousFluency: 58,
      currentFluency: 71,
      fluencyDelta: 13,
      previousTaskCompletion: 64,
      currentTaskCompletion: 82,
      taskCompletionDelta: 18,
    },
  );
  assert.equal(
    compareAttemptScores(null, {
      fluencyScore: 70,
      taskCompletionScore: 80,
    }),
    null,
  );
});

test("all built-in shadow tasks use substantial uninterrupted passages", () => {
  const shadowTasks = speakingTasks.filter((task) => task.mode === "shadow");
  assert.ok(shadowTasks.length >= 3);
  for (const task of shadowTasks) {
    assert.ok(
      (task.target?.length || 0) >= 800,
      `${task.id} should contain a long shadowing passage`,
    );
  }
});

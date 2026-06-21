export type TranscriptRole = "user" | "assistant";

export type TranscriptTurn = {
  id: string;
  role: TranscriptRole;
  german: string;
  english: string;
  translationStatus: "idle" | "loading" | "ready" | "error";
  complete: boolean;
};

export type RealtimeTranscriptUpdate =
  | {
      kind: "transcript";
      itemId: string;
      role: TranscriptRole;
      text: string;
      complete: boolean;
    }
  | {
      kind: "response-done";
    }
  | {
      kind: "response-started";
    }
  | {
      kind: "speech-started";
    }
  | {
      kind: "speech-stopped";
    }
  | {
      kind: "error";
      message: string;
    }
  | null;

export function readRealtimeTranscriptUpdate(
  event: Record<string, unknown>,
): RealtimeTranscriptUpdate {
  const type = readString(event.type);

  if (type === "input_audio_buffer.speech_started") {
    return { kind: "speech-started" };
  }

  if (type === "input_audio_buffer.speech_stopped") {
    return { kind: "speech-stopped" };
  }

  if (type === "conversation.item.input_audio_transcription.delta") {
    return {
      kind: "transcript",
      itemId: readString(event.item_id) || "active-user-turn",
      role: "user",
      text: readString(event.delta),
      complete: false,
    };
  }

  if (type === "conversation.item.input_audio_transcription.completed") {
    return {
      kind: "transcript",
      itemId: readString(event.item_id) || "active-user-turn",
      role: "user",
      text: readString(event.transcript),
      complete: true,
    };
  }

  if (type === "response.output_audio_transcript.delta") {
    return {
      kind: "transcript",
      itemId: readString(event.item_id) || "active-assistant-turn",
      role: "assistant",
      text: readString(event.delta),
      complete: false,
    };
  }

  if (type === "response.output_audio_transcript.done") {
    return {
      kind: "transcript",
      itemId: readString(event.item_id) || "active-assistant-turn",
      role: "assistant",
      text: readString(event.transcript),
      complete: true,
    };
  }

  if (type === "response.done") {
    return { kind: "response-done" };
  }

  if (type === "response.created") {
    return { kind: "response-started" };
  }

  if (type === "error") {
    const error = isRecord(event.error) ? event.error : null;
    return {
      kind: "error",
      message:
        readString(error?.message) ||
        "The live voice session returned an unexpected error.",
    };
  }

  return null;
}

export function applyTranscriptUpdate(
  turns: TranscriptTurn[],
  update: Exclude<RealtimeTranscriptUpdate, null>,
): TranscriptTurn[] {
  if (update.kind !== "transcript" || !update.text) {
    return turns;
  }

  const index = turns.findIndex((turn) => turn.id === update.itemId);

  if (index === -1) {
    return [
      ...turns,
      {
        id: update.itemId,
        role: update.role,
        german: update.text,
        english: "",
        translationStatus: update.complete ? "loading" : "idle",
        complete: update.complete,
      },
    ];
  }

  const current = turns[index];
  const german = update.complete
    ? update.text
    : `${current.german}${update.text}`;
  const next = [...turns];
  next[index] = {
    ...current,
    german,
    complete: current.complete || update.complete,
    translationStatus: update.complete ? "loading" : current.translationStatus,
  };
  return next;
}

export function setTurnTranslation(
  turns: TranscriptTurn[],
  itemId: string,
  english: string,
  failed = false,
) {
  return turns.map((turn) =>
    turn.id === itemId
      ? {
          ...turn,
          english,
          translationStatus: failed ? ("error" as const) : ("ready" as const),
        }
      : turn,
  );
}

export function learnerTranscript(turns: TranscriptTurn[]) {
  return turns
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.german.trim())
    .filter(Boolean)
    .join("\n");
}

export function conversationTranscript(turns: TranscriptTurn[]) {
  return turns
    .filter((turn) => turn.complete && turn.german.trim())
    .map((turn) => `${turn.role === "user" ? "User" : "AI"}: ${turn.german.trim()}`)
    .join("\n");
}

export function roleplayIsComplete(
  turns: TranscriptTurn[],
  assistantReplyCount: number,
) {
  const latestAssistant = [...turns]
    .reverse()
    .find((turn) => turn.role === "assistant" && turn.complete);
  const normalized = latestAssistant?.german.toLocaleLowerCase("de-DE") || "";

  return (
    normalized.includes("die aufgabe ist abgeschlossen") ||
    normalized.includes("klicke jetzt auf analysieren") ||
    assistantReplyCount >= 6
  );
}

export function compareAttemptScores(
  previous: { fluencyScore: number; taskCompletionScore: number } | null,
  current: { fluencyScore: number; taskCompletionScore: number },
) {
  if (!previous) {
    return null;
  }

  return {
    previousFluency: previous.fluencyScore,
    currentFluency: current.fluencyScore,
    fluencyDelta: current.fluencyScore - previous.fluencyScore,
    previousTaskCompletion: previous.taskCompletionScore,
    currentTaskCompletion: current.taskCompletionScore,
    taskCompletionDelta:
      current.taskCompletionScore - previous.taskCompletionScore,
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

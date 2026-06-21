import { getOpenAIErrorMessage, isRecord } from "@/lib/ai/response-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY is required for audio upload transcription. Use browser dictation or paste transcript fallback in demo mode.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return Response.json(
      { error: "Upload an audio file under the 'audio' field." },
      { status: 400 },
    );
  }

  const questionGerman = readFormString(formData, "questionGerman");

  const openAIForm = new FormData();
  openAIForm.append("file", audio, audio.name || "interview-answer.webm");
  openAIForm.append(
    "model",
    process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
  );
  openAIForm.append("language", "de");
  openAIForm.append("response_format", "json");
  openAIForm.append(
    "prompt",
    `German job interview answer. Question: ${questionGerman}. Preserve learner mistakes.`,
  );

  const transcriptResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: openAIForm,
  });

  const transcriptData: unknown = await transcriptResponse.json();

  if (!transcriptResponse.ok) {
    return Response.json(
      { error: getOpenAIErrorMessage(transcriptData), details: transcriptData },
      { status: transcriptResponse.status },
    );
  }

  const transcript =
    isRecord(transcriptData) && typeof transcriptData.text === "string"
      ? transcriptData.text
      : "";

  if (!transcript) {
    return Response.json(
      { error: "Transcription completed without text.", details: transcriptData },
      { status: 502 },
    );
  }

  return Response.json({ transcript });
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

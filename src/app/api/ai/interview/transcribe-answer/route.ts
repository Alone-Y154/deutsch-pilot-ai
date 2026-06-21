import {
  interviewProfileAnalysisSchema,
  interviewQuestionSchema,
} from "@/lib/ai/interview-schemas";
import {
  generateInterviewAnswerFeedback,
  type InterviewAnswerFeedbackInput,
} from "@/lib/ai/interview-ai";
import { analyzeSpeechAudio } from "@/lib/ai/audio-speech-feedback";
import { getOpenAIErrorMessage, isRecord } from "@/lib/ai/response-utils";

export const runtime = "nodejs";

const maxAudioUploadBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is required for interview audio analysis." },
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

  if (audio.size > maxAudioUploadBytes) {
    return Response.json(
      { error: "Interview answers must be 8 MB or smaller." },
      { status: 413 },
    );
  }

  const question = interviewQuestionSchema.safeParse(
    readJsonField(formData, "question"),
  );
  const analysis = interviewProfileAnalysisSchema.safeParse(
    readJsonField(formData, "analysis"),
  );

  if (!question.success || !analysis.success) {
    return Response.json(
      { error: "Question and interview profile data are required." },
      { status: 400 },
    );
  }

  const openAIForm = new FormData();
  openAIForm.append("file", audio, audio.name || "interview-answer.wav");
  openAIForm.append(
    "model",
    process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe",
  );
  openAIForm.append("language", "de");
  openAIForm.append("response_format", "json");
  openAIForm.append(
    "prompt",
    `German job interview answer. Question: ${question.data.questionGerman}. Preserve learner mistakes, hesitations, and self-corrections.`,
  );

  const transcriptResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAIForm,
    },
  );
  const transcriptData: unknown = await transcriptResponse.json();

  if (!transcriptResponse.ok) {
    return Response.json(
      { error: getOpenAIErrorMessage(transcriptData), details: transcriptData },
      { status: transcriptResponse.status },
    );
  }

  const transcript =
    isRecord(transcriptData) && typeof transcriptData.text === "string"
      ? transcriptData.text.trim()
      : "";

  if (!transcript) {
    return Response.json(
      { error: "Transcription completed without text.", details: transcriptData },
      { status: 502 },
    );
  }

  const feedbackInput: InterviewAnswerFeedbackInput = {
    jobDescription: readFormString(formData, "jobDescription"),
    resume: readFormString(formData, "resume"),
    targetLevel:
      readFormString(formData, "targetLevel") || analysis.data.targetLevel,
    interviewType:
      readFormString(formData, "interviewType") ||
      "mixed HR + behavioral + role-specific",
    questionCount: normalizeQuestionCount(
      Number(readFormString(formData, "questionCount")),
    ),
    analysis: analysis.data,
    question: question.data,
    transcript,
  };
  let acousticObservations = "";
  let audioWarning = "";

  try {
    acousticObservations = await analyzeSpeechAudio(audio, {
      transcript,
      mode: "interview",
      level: feedbackInput.targetLevel,
      taskTitle: `Interview: ${question.data.category}`,
      taskPrompt: question.data.questionGerman,
    });
  } catch (error) {
    audioWarning =
      error instanceof Error
        ? error.message
        : "Audio-aware interview analysis was unavailable.";
  }

  try {
    const feedback = await generateInterviewAnswerFeedback({
      ...feedbackInput,
      acousticObservations: acousticObservations || undefined,
    });

    return Response.json({
      transcript,
      analysisBasis: acousticObservations ? "audio" : "transcript",
      audioWarning: audioWarning || undefined,
      ...feedback,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Interview answer analysis failed.",
      },
      { status: 502 },
    );
  }
}

function readJsonField(formData: FormData, key: string) {
  const value = readFormString(formData, key);
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuestionCount(count: number) {
  return Number.isFinite(count) ? Math.max(3, Math.min(count, 12)) : 8;
}

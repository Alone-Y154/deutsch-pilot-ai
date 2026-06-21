import "server-only";

import {
  extractOutputText,
  getOpenAIErrorMessage,
  responsesUrl,
} from "@/lib/ai/response-utils";

export async function translateGermanSpeakingTurn(text: string) {
  const cleanText = text.trim();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!cleanText) {
    throw new Error("German transcript text is required.");
  }

  if (!apiKey) {
    return {
      translation: "English translation is unavailable until OpenAI is configured.",
      source: "demo" as const,
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
            "Translate spoken German into natural, faithful English. Preserve meaning, learner mistakes, uncertainty, and incomplete thoughts. Return only the translation.",
        },
        { role: "user", content: cleanText },
      ],
    }),
  });
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getOpenAIErrorMessage(data));
  }

  return {
    translation: extractOutputText(data).trim(),
    source: "openai" as const,
  };
}

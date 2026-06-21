import "server-only";

export const responsesUrl = "https://api.openai.com/v1/responses";

export function extractOutputText(data: unknown) {
  if (isRecord(data) && typeof data.output_text === "string") {
    return data.output_text;
  }

  if (!isRecord(data) || !Array.isArray(data.output)) {
    throw new Error("OpenAI response did not include output text.");
  }

  const chunks: string[] = [];

  for (const item of data.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  const text = chunks.join("");

  if (!text) {
    throw new Error("OpenAI response output text was empty.");
  }

  return text;
}

export function getOpenAIErrorMessage(data: unknown) {
  if (
    isRecord(data) &&
    isRecord(data.error) &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }

  return "OpenAI request failed.";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

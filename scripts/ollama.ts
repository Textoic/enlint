const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
const model = process.env.OLLAMA_MODEL ?? "qwen3.8:27b";

export const modelName = model;

const withoutReasoning = (content: string) =>
  content.replace(/<think>[\s\S]*?<\/think>/giu, "").trim();

export type JsonSchema = Record<string, unknown>;

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatResponse = { message?: { content?: string; thinking?: string } };

const isChatResponse = (value: unknown): value is ChatResponse =>
  typeof value === "object" && value !== null;

export class OllamaError extends Error {}

export default async function ask<T>(
  messages: Message[],
  schema: JsonSchema,
  { temperature = 0 }: { temperature?: number } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        format: schema,
        stream: false,
        think: false,
        options: {
          temperature,
          num_ctx: 16384,
        },
      }),
    });
  } catch (cause) {
    throw new OllamaError(
      `Cannot reach Ollama at ${host}. Start it with \`ollama serve\`, or set OLLAMA_HOST.`,
      { cause },
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new OllamaError(
      response.status === 404
        ? `Ollama has no model named "${model}". Run \`ollama list\` to see what is installed, or set OLLAMA_MODEL.`
        : `Ollama returned ${response.status}: ${detail}`,
    );
  }

  const body: unknown = await response.json();
  const content = isChatResponse(body) ? body.message?.content : undefined;
  if (!content) {
    throw new OllamaError(
      `Ollama returned no content: ${JSON.stringify(body)}`,
    );
  }

  try {
    return JSON.parse(withoutReasoning(content)) as T;
  } catch (cause) {
    throw new OllamaError(
      `Ollama returned something that is not JSON:\n${content}`,
      { cause },
    );
  }
}

export const unavailable = async (): Promise<string | null> => {
  let response: Response;
  try {
    response = await fetch(`${host}/api/tags`);
  } catch {
    return `Cannot reach Ollama at ${host}. Start it with \`ollama serve\`, or set OLLAMA_HOST.`;
  }

  if (!response.ok) {
    return `Ollama at ${host} returned ${response.status} for /api/tags.`;
  }

  const body: unknown = await response.json();
  const models =
    typeof body === "object" && body !== null && "models" in body
      ? (body as { models: { name?: string }[] }).models
      : [];
  const names = models.map(({ name }) => name ?? "");
  if (
    names.length > 0 &&
    !names.some((name) => name === model || name.split(":")[0] === model)
  ) {
    return `Ollama at ${host} has no model named "${model}". Installed: ${
      names.join(", ") || "none"
    }. Set OLLAMA_MODEL to one of them.`;
  }

  return null;
};

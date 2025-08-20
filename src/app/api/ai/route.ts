import { NextRequest } from "next/server";
import OpenAI from "openai";

const MODEL_NAME = process.env.AI_MODEL_NAME ?? "gpt-5-nano";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_API_BASE_URL; // Optional (e.g., OpenRouter)
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Please set it in your environment (.env.local)."
    );
  }
  const rawTimeout = process.env.AI_API_TIMEOUT_MS;
  const parsed = rawTimeout ? Number(rawTimeout) : 15000;
  const timeout = Number.isFinite(parsed) && parsed >= 0 ? parsed : 15000;
  return new OpenAI({ apiKey, baseURL, timeout });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const prompt =
      typeof body === "object" && body !== null && "prompt" in body
        ? String((body as { prompt: unknown }).prompt ?? "")
        : "";

    if (!prompt.trim()) {
      return Response.json({ reply: "Please enter a command or question." });
    }

    // Simple local commands for convenience
    const local = tryLocalCommand(prompt);
    if (local) return Response.json({ reply: local });

    const client = getOpenAIClient();
    try {
      const completion = await client.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant answering concisely for a terminal UI.",
          },
          { role: "user", content: prompt },
        ],
      });
      const reply = completion.choices?.[0]?.message?.content?.trim() ?? "(no reply)";
      return Response.json({ reply });
    } catch {
      // Fallback to Responses API for providers that don't support Chat Completions
      const completion = await client.responses.create({
        model: MODEL_NAME,
        instructions: "You are a helpful AI assistant answering concisely for a terminal UI.",
        input: prompt,
      });
      // Prefer SDK convenience accessor if present; otherwise extract from output array
      const outputText = (completion as { output_text?: unknown }).output_text;
      const reply =
        typeof outputText === "string" && outputText.trim().length > 0
          ? outputText.trim()
          : extractResponseText(completion);
      return Response.json({ reply });
    }
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
    return new Response(
      JSON.stringify({ error: message, hint: errorHint(message) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET() {
  // Simple healthcheck; returns whether server can see basic env
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  return Response.json({ ok: true, model: MODEL_NAME, hasKey });
}

function tryLocalCommand(prompt: string): string | null {
  const lower = prompt.trim().toLowerCase();
  if (lower === "help") {
    return [
      "Available commands:",
      "- help: Show this help",
      "- echo <text>: Echo back text",
      "- time: Show server time",
      "- Otherwise, the message is sent to the AI model (" + MODEL_NAME + ")",
    ].join("\n");
  }
  if (lower.startsWith("echo ")) return prompt.slice(5);
  if (lower === "time") return new Date().toISOString();
  return null;
}

function errorHint(message: string): string | undefined {
  if (message.includes("OPENAI_API_KEY")) {
    return "Set OPENAI_API_KEY in .env.local. If using OpenRouter, also set AI_API_BASE_URL=https://openrouter.ai/api/v1 and ensure your key is valid.";
  }
  if (message.toLowerCase().includes("model") && message.toLowerCase().includes("not")) {
    return "Verify the model name is correct and accessible to your account. You can override with AI_MODEL_NAME in .env.local.";
  }
  return undefined;
}

function extractResponseText(response: unknown): string {
  if (typeof response !== "object" || response === null) return "(no reply)";
  const r = response as { output?: unknown };
  const output = Array.isArray(r.output) ? (r.output as unknown[]) : undefined;
  if (!output || output.length === 0) return "(no reply)";
  const first = output[0];
  if (typeof first !== "object" || first === null) return "(no reply)";
  const content = (first as { content?: unknown }).content;
  const contentArr = Array.isArray(content) ? (content as unknown[]) : undefined;
  if (!contentArr) return "(no reply)";
  for (const part of contentArr) {
    if (typeof part === "object" && part !== null) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        return text.trim();
      }
    }
  }
  return "(no reply)";
}



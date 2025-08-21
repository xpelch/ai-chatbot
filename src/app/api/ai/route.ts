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
    const url = new URL(req.url);
    const wantsStream = url.searchParams.get("stream") === "1";

    const body = (await req.json()) as unknown;
    const prompt =
      typeof body === "object" && body !== null && "prompt" in body
        ? String((body as { prompt: unknown }).prompt ?? "")
        : "";

    if (!prompt.trim()) {
      if (wantsStream) {
        return new Response("Please enter a command or question.", {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      return Response.json({ reply: "Please enter a command or question." });
    }

    // Simple local commands for convenience
    const local = tryLocalCommand(prompt);
    if (local) {
      if (wantsStream) {
        return new Response(local, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      return Response.json({ reply: local });
    }

    const client = getOpenAIClient();

    if (wantsStream) {
      try {
        const stream = await client.chat.completions.create({
          model: MODEL_NAME,
          stream: true,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful AI assistant for a terminal-style chat. You may use Markdown and simple HTML (b, i, br, code, pre, ul, ol, li, a) for formatting. Use hyphen bullets for lists, fenced code blocks for code, and short paragraphs. Avoid images and complex HTML. Keep answers concise.",
            },
            { role: "user", content: prompt },
          ],
        });

        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of stream as AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>) {
                const piece =
                  (chunk?.choices?.[0]?.delta?.content as string | undefined) ?? "";
                if (piece) controller.enqueue(encoder.encode(piece));
              }
            } catch {
              // swallow stream errors; the finally will close
            } finally {
              controller.close();
            }
          },
        });

        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch {
        // Fallback: do a one-shot completion and stream it as a single chunk
        try {
          const completion = await client.chat.completions.create({
            model: MODEL_NAME,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful AI assistant for a terminal-style chat. You may use Markdown and simple HTML (b, i, br, code, pre, ul, ol, li, a) for formatting. Use hyphen bullets for lists, fenced code blocks for code, and short paragraphs. Avoid images and complex HTML. Keep answers concise.",
              },
              { role: "user", content: prompt },
            ],
          });
          const reply = completion.choices?.[0]?.message?.content?.trim() ?? "(no reply)";
          return new Response(reply, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        } catch {
          // Last fallback: Responses API one-shot
          const completion = await client.responses.create({
            model: MODEL_NAME,
            instructions:
              "You are a helpful AI assistant for a terminal-style chat. You may use Markdown and simple HTML (b, i, br, code, pre, ul, ol, li, a) for formatting. Use hyphen bullets for lists, fenced code blocks for code, and short paragraphs. Avoid images and complex HTML. Keep answers concise.",
            input: prompt,
          });
          const outputText = (completion as { output_text?: unknown }).output_text;
          const reply =
            typeof outputText === "string" && outputText.trim().length > 0
              ? outputText.trim()
              : extractResponseText(completion);
          return new Response(reply, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      }
    }

    // Non-streaming JSON response (existing behavior)
    try {
      const completion = await client.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant for a terminal-style chat. You may use Markdown and simple HTML (b, i, br, code, pre, ul, ol, li, a) for formatting. Use hyphen bullets for lists, fenced code blocks for code, and short paragraphs. Avoid images and complex HTML. Keep answers concise.",
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
        instructions: "Your name is Blockhead. You are a helpful AI assistant chatbot for onchain data. Always format lists using Markdown or simple HTML (b, i, br, code, pre, ul, ol, li, a). Do not strip leading hyphens. Keep answers concise.",
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
      "Available commands (Markdown/HTML supported):",
      "",
      "- help: Show this help",
      "- echo <text>: Echo back text",
      "- time: Show server time",
      "- You can format your messages using Markdown and simple HTML (b, i, br, code, pre, ul, ol, li, a)",
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



// app/api/ai/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { resolveLocalCommand } from "@/lib/localCommands";

const MODEL_NAME = process.env.AI_MODEL_NAME ?? "gpt-5-nano";

/**
 * Blockhead persona: witty, hype (sans lourdeur), crypto-native.
 * Règles: concis, actionnable, un peu d'humour, pas de terminal/CLI vibe.
 */
const SYSTEM_PROMPT = `
Your name is Blockhead 🟧.
You are a witty, high-energy degen sidekick for on-chain topics (token launches, AMMs, DeFi, Base, EVM).
Tone: playful and sharp, never cringe, never insulting, no profanity. Keep it friendly and fun.
Format with Markdown (and simple HTML if needed: b, i, br, code, pre, ul, ol, li, a). No images.
Style:
- Open with a crisp one-liner hook when it helps.
- Use tight bullets. 1–3 short paragraphs max before bullets.
- Always favor numbers, steps, equations, or code when asked.
- Emojis: sparingly (🔥 🎲 🧠 🟧). Zero emoji spam.
- No terminal/CLI framing; you're a chat buddy, not a shell.

Domain behavior:
- Be precise about on-chain mechanics (AMM math, fees, slippage, LP/IL, tokenomics).
- If you estimate, state assumptions briefly.
- Never claim to send transactions or access wallets/balances.
- Add a tiny disclaimer “Not financial advice.” on speculative calls.

Boundaries:
- No harassment, no illegal guidance, no personal data inference.
- If a request is unsafe, refuse briefly and offer a safe angle.

Answer quality rules:
- Prefer concrete next actions over theory.
- Keep outputs compact; collapse fluff.
- Use fenced code blocks for code.
`.trim();

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
        return new Response("Say something and I'll make it spicy (but useful).", {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
      return Response.json({ reply: "Say something and I'll make it spicy (but useful)." });
    }

    // Local commands (sync/async)
    const maybe = await resolveLocalCommand(prompt);
    if (maybe) {
      if (wantsStream) {
        return new Response(maybe, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      return Response.json({ reply: maybe });
    }

    const client = getOpenAIClient();

    if (wantsStream) {
      try {
        const stream = await client.chat.completions.create({
          model: MODEL_NAME,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        });

        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of stream as AsyncIterable<{
                choices?: Array<{ delta?: { content?: string } }>;
              }>) {
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
        // Fallback: one-shot completion streamed as single chunk
        try {
          const completion = await client.chat.completions.create({
            model: MODEL_NAME,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
          });
          const reply =
            completion.choices?.[0]?.message?.content?.trim() ?? "(no reply)";
          return new Response(reply, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        } catch {
          // Last fallback: Responses API one-shot
          const completion = await client.responses.create({
            model: MODEL_NAME,
            instructions: SYSTEM_PROMPT,
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      });
      const reply = completion.choices?.[0]?.message?.content?.trim() ?? "(no reply)";
      return Response.json({ reply });
    } catch {
      // Fallback to Responses API (providers sans Chat Completions)
      const completion = await client.responses.create({
        model: MODEL_NAME,
        instructions: SYSTEM_PROMPT,
        input: prompt,
      });
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

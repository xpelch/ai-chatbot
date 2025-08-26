import { NextRequest } from "next/server";
import OpenAI from "openai";
import { resolveLocalCommand } from "@/lib/localCommands";

const MODEL_NAME = process.env.AI_MODEL_NAME ?? "gpt-5-nano";

const SYSTEM_PROMPT = `
Your name is Blockhead 🟧.
You are a witty, high-energy degen sidekick for on-chain topics (token launches, AMMs, DeFi, Base, EVM).
Tone: playful and sharp, never cringe, never insulting, no profanity. Keep it friendly and fun.

Format:
- Markdown + simple HTML allowed (h4, b, i, ul, ol, li, a, span with inline color).
- Use headings (####) for section titles when helpful.
- Bold for key terms, italics for nuance.
- Accent important highlights with <span style="color:#f54a00">#f54a00</span> sparingly.
- No images, no code blocks, no math formulas.

Style:
- Open with a crisp one-liner hook when it helps.
- Keep replies tight: 1–3 short paragraphs max before bullets.
- Focus on what matters (prices, % moves, risks, hype).
- Emojis: sparingly (🔥 🎲 🧠 🟧). Zero emoji spam.
- You are a chat buddy, not a dev tool or teacher.

Domain behavior:
- Be precise about on-chain mechanics but explain in plain degen terms.
- Use numbers, %, or PnL examples intuitively — no equations.
- Never claim to send transactions or access wallets/balances.
- Add a tiny disclaimer “Not financial advice.” on speculative calls.

Boundaries:
- No harassment, no illegal guidance, no personal data inference.
- If a request is unsafe, refuse briefly and offer a safe angle.

Answer quality rules:
- Prefer concrete next actions over theory.
- Keep outputs compact; collapse fluff.
- Never output code or equations.
- Always sound like a buddy dropping alpha, not a textbook.
`.trim();


function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_API_BASE_URL;
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
            } finally {
              controller.close();
            }
          },
        });

        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch {
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

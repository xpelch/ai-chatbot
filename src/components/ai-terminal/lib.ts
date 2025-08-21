/* ===========================
 * Types, constants, and utils
 * =========================== */
export type ChatRole = "user" | "assistant" | "system" | "error";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export const WELCOME_MSG = "Welcome! Connect your wallet and ask me anything.";
export const NEW_CHAT_MSG = "New chat started. Ask your question.";
export const AI_ENDPOINT = "/api/ai";
export const REQUEST_TIMEOUT_MS = 20_000;
export const AVATAR_IMG = "/block_head.png";
export const USER_AVATARS = ["/habibi_user.png", "/chinese_user.png", "/man_user.png", "/girl_user.png"];
export const QUICK_PROMPTS: string[] = [
  "help",
  "time",
  "Summarize ETH valuation in 3 bullets",
  "Explain rollups like I'm five",
  "What's my balance?",
];

export function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function getRandomUserAvatar() {
  return USER_AVATARS[Math.floor(Math.random() * USER_AVATARS.length)];
}

export function shortAddress(addr?: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : undefined;
}

export function isAbortError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    String((err as { name?: unknown }).name) === "AbortError"
  );
}

export function isNetworkError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    String((err as { message?: unknown }).message)
      .toLowerCase()
      .includes("failed to fetch")
  );
}

export function errorMessage(err: unknown) {
  if (isAbortError(err)) return "Request timed out after 20s. Try again or reduce the prompt size.";
  if (isNetworkError(err)) return "Network error: unable to reach AI service. Check your internet, API base URL, or CORS.";
  if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

export async function fetchAiReply(prompt: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; hint?: string };
    if (!res.ok) {
      const details = [data.error, data.hint].filter(Boolean).join(" — ");
      throw new Error(details || `Request failed (${res.status})`);
    }
    return (data.reply ?? "(no reply)").trim();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAiStream(
  prompt: string,
  onChunk: (text: string) => void,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${AI_ENDPOINT}?stream=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      // Fallback: consume as text
      const text = await res.text();
      if (text) onChunk(text);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  } finally {
    clearTimeout(timer);
  }
}



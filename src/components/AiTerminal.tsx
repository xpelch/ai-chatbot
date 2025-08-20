"use client";

import React from "react";
import { usePrivy, useLogin, useLogout } from "@privy-io/react-auth";
import Image from "next/image";

/* ===========================
 * Types & constants
 * =========================== */
type ChatRole = "user" | "assistant" | "system" | "error";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const WELCOME_MSG = "Welcome! Connect your wallet and ask me anything.";
const NEW_CHAT_MSG = "New chat started. Ask your question.";
const AI_ENDPOINT = "/api/ai";
const REQUEST_TIMEOUT_MS = 20_000;
const AVATAR_IMG = "/ai_agent_no_bg.png";
const QUICK_PROMPTS: string[] = [
  "help",
  "time",
  "Summarize the latest crypto news in 3 bullets",
  "Explain rollups like I'm five",
];

/* ===========================
 * Utilities
 * =========================== */
function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function shortAddress(addr?: string) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : undefined;
}

function isAbortError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    String((err as { name?: unknown }).name) === "AbortError"
  );
}

function isNetworkError(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    String((err as { message?: unknown }).message)
      .toLowerCase()
      .includes("failed to fetch")
  );
}

function errorMessage(err: unknown) {
  if (isAbortError(err)) return "Request timed out after 20s. Try again or reduce the prompt size.";
  if (isNetworkError(err)) return "Network error: unable to reach AI service. Check your internet, API base URL, or CORS.";
  if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

async function fetchAiReply(prompt: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<string> {
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

/* ===========================
 * UI Primitives
 * =========================== */
function GlassCard(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        "rounded-3xl border border-white/10 bg-zinc-900/40 " +
        "backdrop-blur supports-[backdrop-filter]:bg-zinc-900/30 shadow-2xl " +
        (props.className ?? "")
      }
    >
      {props.children}
    </div>
  );
}

/* ===========================
 * Header
 * =========================== */
function HeaderBar({
  ready,
  authenticated,
  addr,
  onLogin,
  onLogout,
}: {
  ready: boolean;
  authenticated: boolean;
  addr?: string;
  onLogin: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 overflow-hidden rounded-xl ring-1 ring-white/15">
          <Image src={AVATAR_IMG} alt="AI Agent" width={36} height={36} className="object-cover" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">Blockhead</h1>
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/70">
            Alpha
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!ready ? (
          <div className="h-9 w-28 animate-pulse rounded-xl bg-white/5" />
        ) : authenticated ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-white/70">{addr}</span>
            <button
              onClick={onLogout}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

/* ===========================
 * Quick actions (below chat)
 * =========================== */
function QuickActions({
  prompts,
  disabled,
  onUsePrompt,
  onRegenerate,
  onCopy,
  onClear,
}: {
  prompts: string[];
  disabled: boolean;
  onUsePrompt: (p: string) => void;
  onRegenerate: () => void;
  onCopy: () => void;
  onClear: () => void;
}) {
  return (
    <div className="border-t border-white/10 bg-black/20">
      <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {prompts.map((qp) => (
          <button
            key={qp}
            disabled={disabled}
            onClick={() => onUsePrompt(qp)}
            className="whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50"
          >
            {qp}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            disabled={disabled}
            onClick={onRegenerate}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            disabled={disabled}
            onClick={onCopy}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          >
            Copy
          </button>
          <button
            disabled={disabled}
            onClick={onClear}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================
 * Chat bubbles
 * =========================== */
function Bubble({ role, content }: { role: ChatMessage["role"]; content: string }) {
  const isUser = role === "user";
  const isError = role === "error";
  const isSystem = role === "system";

  const base =
    "max-w-[75ch] rounded-2xl px-4 py-3 text-[15px] leading-relaxed break-words shadow-lg";
  const style = isUser
    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
    : isError
    ? "bg-red-500/10 text-red-200 ring-1 ring-red-500/30"
    : isSystem
    ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/30"
    : "bg-white/5 text-white ring-1 ring-white/10";

  return (
    <div className="grid grid-cols-[56px_1fr_56px] items-end gap-3">
      {!isUser ? (
        <div className="col-start-1 col-end-2">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/15">
            <Image src={AVATAR_IMG} alt="AI Agent" width={56} height={56} className="object-cover" />
          </div>
        </div>
      ) : (
        <div className="col-start-1 col-end-2" />
      )}

      <div
        className={
          "col-start-2 col-end-3 " +
          (isUser ? "justify-self-end" : "justify-self-start")
        }
      >
        <div className={`${base} ${style}`}>
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>

      {isUser ? (
        <div className="col-start-3 col-end-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white ring-1 ring-white/15">
            U
          </div>
        </div>
      ) : (
        <div className="col-start-3 col-end-4" />
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="grid grid-cols-[56px_1fr_56px] items-end gap-3">
      <div className="col-start-1 col-end-2">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/15">
          <Image src={AVATAR_IMG} alt="AI Agent" width={56} height={56} className="object-cover" />
        </div>
      </div>
      <div className="col-start-2 col-end-3">
        <div className="flex h-10 items-end gap-1 pb-1 text-white/60">
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:-0.2s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:0.2s]" />
        </div>
      </div>
      <div className="col-start-3 col-end-4" />
    </div>
  );
}

/* ===========================
 * Composer (fixed: perfect vertical alignment)
 * - Parent grid now items-stretch
 * - Button self-stretches to textarea height (no hardcoded h-*)
 * - Both share the same 2xl radius; consistent borders
 * =========================== */
function Composer({
  value,
  disabled,
  onChange,
  onSubmit,
  onEnterSend,
  placeholder,
}: {
  value: string;
  disabled: boolean;
  onChange: (s: string) => void;
  onSubmit: () => void;
  onEnterSend: () => void;
  placeholder: string;
}) {
  const handleSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnterSend();
    }
  };

  return (
    <div className="border-t border-white/10 bg-black/30">
      <form
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-4xl grid-cols-[1fr_auto] items-stretch gap-3 px-4 py-4"
      >
        <div className="relative">
          <textarea
            rows={1}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="block w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-[15px] text-white outline-none transition focus:ring-2 focus:ring-emerald-400/30 min-h-[56px] max-h-[200px]"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">
            ↵
          </div>
        </div>

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="self-stretch rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center min-w-[96px]"
        >
          Send
        </button>
      </form>
    </div>
  );
}

/* ===========================
 * Main component
 * =========================== */
export default function AiTerminal() {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: cryptoRandomId(), role: "system", content: WELCOME_MSG },
  ]);

  const chatRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const addMessage = React.useCallback((role: ChatRole, content: string) => {
    setMessages((prev) => [...prev, { id: cryptoRandomId(), role, content }]);
  }, []);
  const addUser = React.useCallback((content: string) => addMessage("user", content), [addMessage]);
  const addAssistant = React.useCallback((content: string) => addMessage("assistant", content), [addMessage]);
  const addError = React.useCallback((content: string) => addMessage("error", content), [addMessage]);

  const submitPrompt = React.useCallback(
    async (raw: string) => {
      const prompt = raw.trim();
      if (!prompt) return;
      addUser(prompt);
      setInput("");
      setBusy(true);
      try {
        const reply = await fetchAiReply(prompt, REQUEST_TIMEOUT_MS);
        addAssistant(reply);
      } catch (err) {
        addError(errorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [addAssistant, addError, addUser]
  );

  const clearChat = React.useCallback(() => {
    setMessages([{ id: cryptoRandomId(), role: "system", content: NEW_CHAT_MSG }]);
  }, []);

  const regenerateLast = React.useCallback(async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) await submitPrompt(lastUser.content);
  }, [messages, submitPrompt]);

  const copyLastAssistant = React.useCallback(async () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant && navigator.clipboard) {
      await navigator.clipboard.writeText(lastAssistant.content);
    }
  }, [messages]);

  const shortAddr = shortAddress(user?.wallet?.address);
  const canInteract = ready && authenticated && !busy;

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(600px_200px_at_20%_0%,rgba(16,185,129,0.12),transparent),radial-gradient(600px_200px_at_80%_0%,rgba(147,51,234,0.12),transparent)]" />
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <GlassCard>
          <HeaderBar
            ready={ready}
            authenticated={!!authenticated}
            addr={shortAddr}
            onLogin={() => login()}
            onLogout={logout}
          />

          <div
            ref={chatRef}
            className="max-h-[calc(100vh-360px)] min-h-[50vh] overflow-y-auto px-5 py-6"
          >
            <div className="mx-auto flex max-w-4xl flex-col gap-6">
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role} content={m.content} />
              ))}
              {busy && <TypingIndicator />}
            </div>
          </div>

          <QuickActions
            prompts={QUICK_PROMPTS}
            disabled={!authenticated || busy}
            onUsePrompt={submitPrompt}
            onRegenerate={regenerateLast}
            onCopy={copyLastAssistant}
            onClear={clearChat}
          />

          <Composer
            value={input}
            disabled={!canInteract}
            onChange={setInput}
            onSubmit={() => submitPrompt(input)}
            onEnterSend={() => submitPrompt(input)}
            placeholder={authenticated ? "Message Blockhead…" : "Connect wallet to chat"}
          />
        </GlassCard>
      </main>
    </div>
  );
}

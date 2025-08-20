"use client";

import React from "react";
import { usePrivy, useLogin, useLogout } from "@privy-io/react-auth";
import Image from "next/image";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "error";
  content: string;
};

export default function AiTerminal() {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: cryptoRandomId(),
      role: "system",
      content: "Welcome! Connect your wallet and ask me anything.",
    },
  ]);
  const [busy, setBusy] = React.useState(false);

  const chatRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const submitPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: cryptoRandomId(), role: "user", content: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; hint?: string };
      if (!res.ok) {
        const details = [data.error, data.hint].filter(Boolean).join(" — ");
        throw new Error(details || `Request failed (${res.status})`);
      }
      const reply = (data.reply ?? "(no reply)").trim();
      setMessages((prev) => [...prev, { id: cryptoRandomId(), role: "assistant", content: reply }]);
    } catch (err: unknown) {
      const isNetwork = typeof err === "object" && err !== null && "message" in err && String((err as { message?: unknown }).message).toLowerCase().includes("failed to fetch");
      const isAbort = typeof err === "object" && err !== null && "name" in err && String((err as { name?: unknown }).name) === "AbortError";
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      const pretty = isAbort
        ? "Request timed out after 20s. Try again or reduce the prompt size."
        : isNetwork
        ? "Network error: unable to reach AI service. Check your internet, API base URL, or CORS."
        : message;
      setMessages((prev) => [...prev, { id: cryptoRandomId(), role: "error", content: pretty }]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPrompt(input);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitPrompt(input);
    }
  };

  const clearChat = () => {
    setMessages([
      { id: cryptoRandomId(), role: "system", content: "New chat started. Ask your question." },
    ]);
  };

  const regenerateLast = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) await submitPrompt(lastUser.content);
  };

  const quickPrompts: string[] = [
    "help",
    "time",
    "Summarize the latest crypto news in 3 bullets",
    "Explain rollups like I'm five",
  ];

  const copyLastAssistant = async () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant && navigator.clipboard) {
      await navigator.clipboard.writeText(lastAssistant.content);
    }
  };

  const shortAddr = user?.wallet?.address
    ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
    : undefined;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight">AI Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          {!ready ? (
            <button className="px-3 py-1 rounded bg-gray-700 text-white" disabled>
              Loading...
            </button>
          ) : authenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-gray-500">{shortAddr}</span>
              <button className="px-3 py-1 rounded bg-gray-700 text-white" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => login()}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 pb-3">
        {quickPrompts.map((qp) => (
          <button
            key={qp}
            className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            onClick={() => submitPrompt(qp)}
            disabled={!authenticated || busy}
          >
            {qp}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-xs sm:text-sm disabled:opacity-50"
            onClick={regenerateLast}
            disabled={!authenticated || busy}
          >
            Regenerate
          </button>
          <button
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-xs sm:text-sm disabled:opacity-50"
            onClick={copyLastAssistant}
            disabled={busy}
          >
            Copy
          </button>
          <button
            className="px-3 py-1 rounded border border-red-300 text-red-600 dark:border-red-700 text-xs sm:text-sm disabled:opacity-50"
            onClick={clearChat}
            disabled={busy}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 border border-gray-200 dark:border-gray-800 rounded-xl p-3 sm:p-4 overflow-y-auto bg-white dark:bg-[#0a0a0a]"
      >
        <div className="flex flex-col gap-3 sm:gap-4">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} />
          ))}
          {busy && (
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-600/10 flex items-center justify-center overflow-hidden">
                <Image
                  src="/ai_agent_no_bg.png"
                  alt="AI Agent"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="mt-3 sm:mt-4 flex items-end gap-2">
        <textarea
          className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white px-3 py-2 outline-none min-h-[44px] max-h-[200px]"
          placeholder={authenticated ? "Type a message... (Shift+Enter for newline)" : "Connect wallet to chat"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!authenticated || busy}
          rows={1}
        />
        <button
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          type="submit"
          disabled={!authenticated || busy || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: ChatMessage["role"]; content: string }) {
  const isUser = role === "user";
  const isError = role === "error";
  const isSystem = role === "system";
  const align = isUser ? "items-end" : "items-start";
  const bubbleColor = isUser
    ? "bg-emerald-600 text-white"
    : isError
    ? "bg-red-600/10 text-red-600 border border-red-700/40"
    : isSystem
    ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100";

  return (
    <div className={`flex ${align} gap-2`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-emerald-600/10 flex items-center justify-center overflow-hidden">
          <Image
            src="/ai_agent_no_bg.png"
            alt="AI Agent"
            width={32}
            height={32}
            className="object-cover"
          />
        </div>
      )}
      <div className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl ${bubbleColor}`}>
        <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{content}</div>
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">🧑</div>
      )}
    </div>
  );
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return Math.random().toString(36).slice(2);
}



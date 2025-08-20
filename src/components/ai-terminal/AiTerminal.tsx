"use client";

import React from "react";
import { usePrivy, useLogin, useLogout } from "@privy-io/react-auth";

import GlassCard from "./GlassCard";
import HeaderBar from "./HeaderBar";
import QuickActions from "./QuickActions";
import Bubble from "./Bubble";
import TypingIndicator from "./TypingIndicator";
import Composer from "./Composer";
import {
  ChatMessage,
  ChatRole,
  WELCOME_MSG,
  NEW_CHAT_MSG,
  QUICK_PROMPTS,
  REQUEST_TIMEOUT_MS,
  cryptoRandomId,
  getRandomUserAvatar,
  shortAddress,
  errorMessage,
  fetchAiReply,
} from "./lib";

export default function AiTerminal() {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: cryptoRandomId(), role: "system", content: WELCOME_MSG },
  ]);

  const userAvatar = React.useMemo(() => getRandomUserAvatar(), []);
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

  const shortAddr = shortAddress(user?.wallet?.address);
  const canInteract = ready && authenticated && !busy;

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(600px_200px_at_20%_0%,rgba(249,115,22,0.12),transparent),radial-gradient(600px_200px_at_80%_0%,rgba(147,51,234,0.12),transparent)]" />
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
                <Bubble key={m.id} role={m.role} content={m.content} userAvatar={userAvatar} />
              ))}
              {busy && <TypingIndicator />}
            </div>
          </div>

          <QuickActions
            prompts={QUICK_PROMPTS}
            disabled={!authenticated || busy}
            onUsePrompt={submitPrompt}
          />

          <Composer
            value={input}
            disabled={!canInteract}
            onChange={setInput}
            onSubmit={() => submitPrompt(input)}
            onEnterSend={() => submitPrompt(input)}
            onClear={clearChat}
            placeholder={authenticated ? "Message Blockhead…" : "Connect wallet to chat"}
          />
        </GlassCard>
      </main>
    </div>
  );
}



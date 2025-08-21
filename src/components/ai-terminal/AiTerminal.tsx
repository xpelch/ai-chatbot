"use client";

import React from "react";
import { usePrivy, useLogin, useLogout } from "@privy-io/react-auth";
import { BiSolidDockRight, BiSolidDockTop, BiChevronDown } from "react-icons/bi";
import Image from "next/image";

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
  fetchAiStream,
} from "./lib";

export default function AiTerminal() {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [dockPosition, setDockPosition] = React.useState<"center" | "right">("center");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: cryptoRandomId(), role: "system", content: WELCOME_MSG },
  ]);
  const [firstChunkReceived, setFirstChunkReceived] = React.useState(false);
  const streamingIdRef = React.useRef<string | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);

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
      setFirstChunkReceived(false);
      streamingIdRef.current = null;

      try {
        await fetchAiStream(
          prompt,
          (chunk) => {
            if (!chunk) return;
            if (streamingIdRef.current === null) {
              const id = cryptoRandomId();
              streamingIdRef.current = id;
              setFirstChunkReceived(true);
              setMessages((prev) => [...prev, { id, role: "assistant", content: chunk }]);
              return;
            }
            const currentId = streamingIdRef.current;
            setMessages((prev) =>
              prev.map((m) => (m.id === currentId ? { ...m, content: m.content + chunk } : m))
            );
          },
          REQUEST_TIMEOUT_MS
        );
      } catch {
        try {
          const reply = await fetchAiReply(prompt, REQUEST_TIMEOUT_MS);
          const currentId = streamingIdRef.current;
          if (currentId === null) {
            addAssistant(reply);
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === currentId ? { ...m, content: reply } : m))
            );
          }
        } catch (e) {
          addError(errorMessage(e));
        }
      } finally {
        setBusy(false);
        setFirstChunkReceived(false);
        streamingIdRef.current = null;
      }
    },
    [addAssistant, addError, addUser]
  );

  const clearChat = React.useCallback(() => {
    setMessages([{ id: cryptoRandomId(), role: "system", content: NEW_CHAT_MSG }]);
  }, []);

  const shortAddr = shortAddress(user?.wallet?.address);
  const canInteract = ready && authenticated && !busy;

  const toggleDock = React.useCallback(() => {
    setDockPosition((prev) => (prev === "center" ? "right" : "center"));
  }, []);

  const getDockStyles = () => {
    switch (dockPosition) {
      case "right":
        return "md:fixed md:right-4 md:top-4 md:bottom-4 md:w-[30%] z-50 md:flex md:flex-col transition-all duration-300 ease-in-out";
      default:
        return "md:mx-auto md:w-full md:max-w-6xl md:px-4 md:py-4 md:h-[calc(100vh-32px)] transition-all duration-300 ease-in-out";
    }
  };

  const mobileMainClass = `md:block ${
    mobileOpen
      ? "fixed inset-0 z-40 w-full h-full p-2 opacity-100 translate-y-0"
      : "fixed inset-0 z-40 w-full h-full p-2 opacity-0 translate-y-4 pointer-events-none"
  } transition-all duration-300 ease-out`;

  return (
    <div className="relative min-h-screen bg-zinc-900 text-zinc-100 pb-16 md:pb-0">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(600px_200px_at_20%_0%,rgba(249,115,22,0.12),transparent),radial-gradient(600px_200px_at_80%_0%,rgba(147,51,234,0.12),transparent)]" />
      </div>

      <main className={`${mobileMainClass} ${getDockStyles()}`}>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-3 left-3 z-50 md:hidden flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 text-white hover:bg-white/15 transition"
            aria-label="Close chat"
            title="Close chat"
          >
            <BiChevronDown className="h-5 w-5" />
          </button>
        )}
        {dockPosition !== "center" && (
          <button
            onClick={toggleDock}
            className="absolute -top-2 -left-2 z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-colors md:flex"
            title="Undock"
          >
            <BiSolidDockTop className="h-4 w-4" />
          </button>
        )}
        <GlassCard className={`transition-all duration-300 ease-in-out ${dockPosition !== "center" ? "h-full flex flex-col" : "h-full flex flex-col"}`}>
          <HeaderBar
            ready={ready}
            authenticated={!!authenticated}
            addr={shortAddr}
            onLogin={() => login()}
            onLogout={logout}
          />

          <div
            ref={chatRef}
            className={`overflow-y-auto px-5 py-6 flex-1 transition-all duration-300 ease-in-out ${
              dockPosition === "center" ? "min-h-0" : "min-h-0"
            }`}
          >
            <div className={`flex flex-col gap-6 transition-all duration-300 ease-in-out ${dockPosition === "center" ? "mx-auto max-w-4xl" : ""}`}>
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role} content={m.content} userAvatar={userAvatar} />
              ))}
              {busy && !firstChunkReceived && <TypingIndicator />}
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

      {dockPosition === "center" && (
        <div className="hidden md:fixed md:bottom-4 md:right-4 md:z-50 md:block">
          <button
            onClick={() => setDockPosition("right")}
            className="hidden h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-all duration-200 ease-in-out transform hover:scale-105 md:flex"
            title="Dock to right"
          >
            <BiSolidDockRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Mobile toggle button */}
      <div className={`fixed bottom-4 right-4 z-50 md:hidden transition-opacity duration-200 ${mobileOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur hover:bg-white/15 transition"
          title={mobileOpen ? "Close chat" : "Open chat"}
        >
          <Image src="/block_head.png" alt="Blockhead" width={32} height={32} />
        </button>
      </div>
    </div>
  );
}



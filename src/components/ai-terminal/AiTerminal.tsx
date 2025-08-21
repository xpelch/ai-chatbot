"use client";

import React from "react";
import { usePrivy, useLogin, useLogout } from "@privy-io/react-auth";
import { BiSolidDockRight, BiSolidDockTop } from "react-icons/bi";

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
            // On first chunk, create the assistant bubble
            if (streamingIdRef.current === null) {
              const id = cryptoRandomId();
              streamingIdRef.current = id;
              setFirstChunkReceived(true);
              setMessages((prev) => [...prev, { id, role: "assistant", content: chunk }]);
              return;
            }
            // Otherwise, append to existing message
            const currentId = streamingIdRef.current;
            setMessages((prev) =>
              prev.map((m) => (m.id === currentId ? { ...m, content: m.content + chunk } : m))
            );
          },
          REQUEST_TIMEOUT_MS
        );
      } catch {
        // Fallback to non-streaming single reply
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
        return "fixed right-4 top-4 bottom-4 w-[30%] z-50 flex flex-col transition-all duration-300 ease-in-out";
      default:
        return "mx-auto w-full max-w-6xl px-4 py-4 h-[calc(100vh-32px)] transition-all duration-300 ease-in-out";
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-900 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(600px_200px_at_20%_0%,rgba(249,115,22,0.12),transparent),radial-gradient(600px_200px_at_80%_0%,rgba(147,51,234,0.12),transparent)]" />
      </div>

      <main className={getDockStyles()}>
        {dockPosition !== "center" && (
          <button
            onClick={toggleDock}
            className="absolute -top-2 -left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-colors"
            title="Undock"
          >
            <BiSolidDockTop className="h-4 w-5" />
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
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setDockPosition("right")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-all duration-200 ease-in-out transform hover:scale-105"
            title="Dock to right"
          >
            <BiSolidDockRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}



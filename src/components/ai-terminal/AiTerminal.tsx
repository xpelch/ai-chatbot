"use client";

import React from "react";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BiSolidDockRight, BiSolidDockTop } from "react-icons/bi";
import Image from "next/image";

import GlassCard from "./GlassCard";
import HeaderBar from "./HeaderBar";
import QuickActions from "./QuickActions";
import Bubble from "./Bubble";
import TypingIndicator from "./TypingIndicator";
import Composer from "./Composer";
import WalletMenu from "../WalletMenu";
import { buildWalletSummaryCard } from "./WalletSummaryCard";
import {
  ChatMessage,
  ChatRole,
  WELCOME_MSG,
  NEW_CHAT_MSG,
  QUICK_PROMPTS,
  REQUEST_TIMEOUT_MS,
  WALLET_SUMMARY_ENDPOINT,
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

  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [dockPosition, setDockPosition] = React.useState<"center" | "right">("center");
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: cryptoRandomId(), role: "system", content: WELCOME_MSG },
  ]);
  const [firstChunkReceived, setFirstChunkReceived] = React.useState(false);
  const streamingIdRef = React.useRef<string | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = React.useState(false);

  // ===== add these hooks near the top (keep your imports) =====
  const [vw, setVw] = React.useState<number>(
    typeof window === "undefined" ? 1200 : window.innerWidth
  );
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
    const onR = () => setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const centerW = Math.min(vw * 0.92, 1120); // center width
  const dockW   = Math.min(vw * 0.30, 520);  // dock width (cap)

  // progress value t: 0 = center, 1 = right-docked
  const tRaw = useMotionValue(dockPosition === "center" ? 0 : 1);
  const t = useSpring(tRaw, { stiffness: 520, damping: 42, mass: 0.9 });

  React.useEffect(() => {
    if (isClient) {
      t.set(dockPosition === "center" ? 0 : 1); // animate to target
    }
  }, [dockPosition, t, isClient]);

  // derive width from t
  const w = useTransform(t, (v) => centerW + (dockW - centerW) * v);

  // derive translateX from t **and** the instantaneous width
  // anchor at left:50% so x positions are absolute in px
  const x = useTransform(t, (v) => {
    const wv = centerW + (dockW - centerW) * v;        // same as w but local
    const xCenter = -wv / 2;                           // to be centered at left:50%
    const xRight  = vw / 2 - 16 - wv;                  // align right with 16px margin
    return xCenter + (xRight - xCenter) * v;           // linear blend
  });

  // border radius along the same timeline
  const radius = useTransform(t, [0, 1], [24, 20]);

  // put these near other hooks (top of component)
  const sheetY = useMotionValue(0);
  const backdropOpacity = useTransform(sheetY, [0, 280], [0.60, 0.00]);
  const sheetRadius = useTransform(sheetY, [0, 180], [24, 32]);

  function shouldClose(offsetY: number, velocityY: number) {
    // easier to close: small pull OR a quick flick
    return offsetY > 56 || velocityY > 350 || sheetY.get() > 72;
  }

  const userAvatar = React.useMemo(() => getRandomUserAvatar(), []);
  const chatRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when user sends message, AI starts typing, or finishes
  React.useEffect(() => {
    const scrollToBottom = () => {
      if (chatRef.current) {
        chatRef.current.scrollTo({ 
          top: chatRef.current.scrollHeight, 
          behavior: "smooth" 
        });
      }
    };
    
    // Only scroll for user messages (when not busy) or when typing starts
    if (!busy) {
      scrollToBottom();
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, busy]);

  // Scroll when typing indicator appears (when busy becomes true and firstChunkReceived is false)
  React.useEffect(() => {
    if (busy && !firstChunkReceived && chatRef.current) {
      chatRef.current.scrollTo({ 
        top: chatRef.current.scrollHeight, 
        behavior: "smooth" 
      });
    }
  }, [busy, firstChunkReceived]);

  // Lock background scroll when sheet open
  React.useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

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

      if (prompt.toLowerCase() === "my bags") {
        const addr = user?.wallet?.address;
        if (!addr) { addAssistant("Connect a wallet first, then hit My bags."); return; }
        addUser(prompt); setInput(""); setBusy(true);
        try {
          const res = await fetch(WALLET_SUMMARY_ENDPOINT, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: addr }),
          });
          const data = (await res.json()) as {
            error?: string; chain?: string; address?: string;
            eth?: { balance: number; priceUsd: number; valueUsd: number }; ts?: number;
          };
          if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
          const bal = data.eth?.balance ?? 0; const px = data.eth?.priceUsd ?? 0; const val = data.eth?.valueUsd ?? 0;
          addAssistant(buildWalletSummaryCard({
            address: addr, shortAddress: shortAddress(addr),
            balanceEth: bal, priceUsd: px, valueUsd: val,
          }));
        } catch (e) { addError(errorMessage(e)); }
        finally { setBusy(false); }
        return;
      }

      addUser(prompt); setInput(""); setBusy(true); setFirstChunkReceived(false);
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
          if (currentId === null) addAssistant(reply);
          else setMessages((prev) => prev.map((m) => (m.id === currentId ? { ...m, content: reply } : m)));
        } catch (e) { addError(errorMessage(e)); }
      } finally {
        setBusy(false); setFirstChunkReceived(false); streamingIdRef.current = null;
      }
    },
    [addAssistant, addError, addUser, user?.wallet?.address]
  );

  const clearChat = React.useCallback(() => {
    setMessages([{ id: cryptoRandomId(), role: "system", content: NEW_CHAT_MSG }]);
  }, []);

  const shortAddr = shortAddress(user?.wallet?.address);
  const canInteract = ready && authenticated && !busy;

  return (
    <div className="relative min-h-screen bg-zinc-900 text-zinc-100 pb-16 md:pb-0">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(600px_200px_at_20%_0%,rgba(249,115,22,0.12),transparent),radial-gradient(600px_200px_at_80%_0%,rgba(147,51,234,0.12),transparent)]" />
      </div>

      {/* ===== Desktop animated dock panel (single timeline for move+resize) ===== */}
      {isClient && (
        <motion.div
          className="hidden md:flex md:flex-col z-40"
          style={{
            position: "fixed",
            top: 16,
            bottom: 16,
            left: "50%",           // never flips; we only animate x
            x,                     // slide
            width: w,              // resize
            borderRadius: radius,  // shape
            willChange: "transform,width,border-radius",
          }}
          initial={false}
        >
        <GlassCard className="h-full flex flex-col shadow-2xl ring-1 ring-white/10">
          {dockPosition === "right" && (
            <button
              onClick={() => setDockPosition("center")}
              className="absolute -top-2 -left-2 h-8 w-8 grid place-items-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition"
              title="Undock"
            >
              <BiSolidDockTop className="h-4 w-4" />
            </button>
          )}

          <HeaderBar
            ready={ready}
            authenticated={!!authenticated}
            addr={shortAddr}
            onLogin={() => login()}
            onWalletMenu={() => setWalletMenuOpen(true)}
            walletMenuOpen={walletMenuOpen}
          />

          <div ref={chatRef} className="overflow-y-auto px-5 py-6 flex-1">
            <div className={`flex flex-col gap-6 ${dockPosition === "center" ? "mx-auto max-w-4xl" : ""}`}>
              {messages.map((m) => (
                <Bubble key={m.id} role={m.role} content={m.content} userAvatar={userAvatar} />
              ))}
              {busy && !firstChunkReceived && <TypingIndicator />}
            </div>
          </div>

          <QuickActions prompts={QUICK_PROMPTS} disabled={!authenticated || busy} onUsePrompt={submitPrompt} />
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
      </motion.div>
      )}

      {/* Mobile: bottom sheet with spring + drag to close */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop follows the drag */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 md:hidden"
              style={{ backgroundColor: "rgba(0,0,0,1)", opacity: backdropOpacity }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Bottom sheet */}
            <motion.main
              key="sheet"
              role="dialog"
              aria-modal="true"
              className="fixed inset-x-0 bottom-0 z-50 md:hidden touch-none" // touch-none => easier drag
              style={{ y: sheetY }}
              initial={{ y: "100%", scale: 0.98, opacity: 0.9 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.9 }}
              transition={{ type: "spring" as const, stiffness: 520, damping: 42, mass: 0.9 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.22}                 // softer rubber-band
              dragMomentum={true}
              onDragStart={() => {
                // lock internal scroll while dragging the sheet
                document.body.style.overscrollBehaviorY = "contain";
              }}
              onDragEnd={(_, info) => {
                document.body.style.overscrollBehaviorY = "";
                if (shouldClose(info.offset.y, info.velocity.y)) setMobileOpen(false);
                else sheetY.stop(); // snap back by animation above
              }}
            >
                            <div className="mx-auto w-[96vw] max-w-none">
                <motion.div style={{ borderTopLeftRadius: sheetRadius, borderTopRightRadius: sheetRadius }}>
                  <GlassCard className="h-[88vh] flex flex-col rounded-t-3xl shadow-2xl ring-1 ring-white/10">
                    {/* bigger grab handle area */}
                    <div className="px-3 pt-2 pb-1">
                      <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
                    </div>

                    <HeaderBar
                      ready={ready}
                      authenticated={!!authenticated}
                      addr={shortAddr}
                      onLogin={() => login()}
                      onWalletMenu={() => setWalletMenuOpen(true)}
                      walletMenuOpen={walletMenuOpen}
                    />

                    <div
                      ref={chatRef}
                      className="overflow-y-auto px-5 py-6 flex-1 overscroll-contain"
                    >
                      <div className="flex flex-col gap-6">
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
                      disabled={!ready || !authenticated || busy}
                      onChange={setInput}
                      onSubmit={() => submitPrompt(input)}
                      onEnterSend={() => submitPrompt(input)}
                      onClear={clearChat}
                      placeholder={authenticated ? "Message Blockhead…" : "Connect wallet to chat"}
                    />
                  </GlassCard>
                </motion.div>
              </div>
            </motion.main>
          </>
        )}
      </AnimatePresence>

      {/* FAB */}
      <AnimatePresence>
        {!mobileOpen && (
          <motion.div
            className="fixed bottom-4 right-4 z-50 md:hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur hover:bg-white/15 transition"
              title="Open chat"
            >
              <Image src="/block_head.png" alt="Blockhead" width={32} height={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock toggle (desktop) */}
      {dockPosition === "center" && (
        <motion.div
          className="hidden md:block md:fixed md:bottom-4 md:right-4 md:z-50"
          initial={false}
          animate={{ rotate: 0, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          <button
            onClick={() => setDockPosition("right")}
            className="h-12 w-12 grid place-items-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition"
            title="Dock to right"
          >
            <BiSolidDockRight className="h-5 w-5" />
          </button>
        </motion.div>
      )}

      {/* Wallet Modal */}
      <WalletMenu isOpen={walletMenuOpen} onClose={() => setWalletMenuOpen(false)} />
    </div>
  );
}

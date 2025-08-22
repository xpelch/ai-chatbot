"use client";

import React from "react";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { createPublicClient, http, formatEther, parseAbi, Address } from "viem";
import { HiOutlineClipboardDocument, HiArrowPath } from "react-icons/hi2";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const BASE_RPC = "https://base-rpc.publicnode.com";
const CHAINLINK_ETH_USD: Address = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"; // Base
const publicClient = createPublicClient({ transport: http(BASE_RPC) });

interface WalletMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type WalletPanelProps = {
  addressShort: string;
  balanceEth?: number;
  priceUsd?: number;
  onCopy?: () => void;
  onRefresh?: () => Promise<void> | void;
  onDisconnect?: () => void;
};

function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

/* =================== Wallet Panel (content only) =================== */
function WalletPanel({
  addressShort,
  balanceEth = 0,
  priceUsd = 0,
  onCopy,
  onRefresh,
  onDisconnect,
}: WalletPanelProps) {
  const [busy, setBusy] = React.useState(false);

  async function handleRefresh() {
    if (!onRefresh) return;
    try {
      setBusy(true);
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="
        w-[92vw] sm:w-[560px] md:w-[700px] lg:w-[820px] xl:w-[860px]
        max-w-none rounded-3xl border border-zinc-800 bg-zinc-950/90
        shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden
      "
    >
      {/* Header */}
      <header className="relative px-5 py-4 border-b border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-9 w-9 rounded-xl bg-orange-500/15 ring-1 ring-orange-500/30">
            <Image src="/block_head.png" alt="" width={18} height={18} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white tracking-wide">Wallet</h2>
            <p className="text-xs text-zinc-400">Manage your account</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_12px_2px_rgba(249,115,22,0.5)]" />
        </div>
      </header>

      {/* Address */}
      <div className="px-5 py-4 space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
          Address
        </label>
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
          <div className="text-white font-medium">{addressShort}</div>
          <button
            onClick={onCopy}
            className="rounded-lg p-2 text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 transition"
            title="Copy address"
          >
            <HiOutlineClipboardDocument className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="px-5 pb-4">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
          Balance
        </label>

        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#1a120f] to-[#120e0c] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                ETH on Base
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={busy}
              className="rounded-lg p-1.5 text-zinc-200 bg-zinc-800/70 hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              title="Refresh balance"
            >
              <HiArrowPath className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="text-[13px] text-zinc-400">Balance</div>
            <div className="mt-1 text-4xl font-extrabold tracking-tight text-white">
              {balanceEth.toFixed(4)}{" "}
              <span className="text-zinc-400 text-xl font-semibold">ETH</span>
            </div>
            <div className="mt-1 text-sm font-medium text-emerald-400">
              {fmtUsd(balanceEth * priceUsd)}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                <div className="text-[11px] text-zinc-500">Spot Price</div>
                <div className="text-sm font-semibold text-white">
                  {fmtUsd(priceUsd)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                <div className="text-[11px] text-zinc-500">Network</div>
                <div className="text-sm font-semibold text-white">Base</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-5 pb-5 pt-3 border-t border-zinc-900 bg-zinc-950/70">
        <button
          onClick={onDisconnect}
          className="w-full rounded-2xl bg-gradient-to-br from-red-600 to-red-700 text-white font-semibold py-3 shadow-[0_8px_24px_rgba(220,38,38,0.35)] hover:from-red-500 hover:to-red-600 active:scale-[0.99] transition"
        >
          Disconnect Wallet
        </button>
      </footer>
    </section>
  );
}

/* =================== Modal Wrapper with Motion =================== */
export default function WalletMenu({ isOpen, onClose }: WalletMenuProps) {
  const { user, logout } = usePrivy();
  const [ethBalance, setEthBalance] = React.useState<string | null>(null);
  const [ethPrice, setEthPrice] = React.useState<number | null>(null);
  const prefersReduceMotion = useReducedMotion();

  const address = user?.wallet?.address as Address | undefined;
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  // Body scroll lock while open
  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Close on ESC
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
  };

  const fetchOnchain = React.useCallback(async () => {
    if (!address) return;
    try {
      const [wei, lrData, decimals] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.readContract({
          address: CHAINLINK_ETH_USD,
          abi: parseAbi([
            "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
          ]),
          functionName: "latestRoundData",
        }),
        publicClient.readContract({
          address: CHAINLINK_ETH_USD,
          abi: parseAbi(["function decimals() view returns (uint8)"]),
          functionName: "decimals",
        }) as Promise<number>,
      ]);

      setEthBalance(formatEther(wei));

      const arr = lrData as readonly unknown[];
      const answerBig = arr[1] as bigint;
      const price = Number(answerBig) / 10 ** Number(decimals);
      setEthPrice(price);
    } catch (err) {
      console.error("onchain fetch failed", err);
    }
  }, [address]);

  React.useEffect(() => {
    if (isOpen && address) fetchOnchain();
  }, [isOpen, address, fetchOnchain]);

  const balanceEth = ethBalance ? Number(ethBalance) : 0;
  const priceUsd = ethPrice || 0;

  // Motion variants: backdrop + centered sheet (scale + slight lift)
  const backdrop = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: prefersReduceMotion ? 0 : 0.18 },
    },
    exit: { opacity: 0, transition: { duration: prefersReduceMotion ? 0 : 0.15 } },
  } as const;

  const panel = {
    hidden: { y: 20, scale: 0.96, opacity: 0 },
    visible: {
      y: 0,
      scale: 1,
      opacity: 1,
      transition: prefersReduceMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 520, damping: 42, mass: 0.9 },
    },
    exit: {
      y: 24,
      scale: 0.96,
      opacity: 0.98,
      transition: prefersReduceMotion
        ? { duration: 0 }
        : { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 },
    },
  } as const;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={backdrop}
        onClick={onClose}
        aria-hidden
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Wallet"
          className="relative z-10 max-h-[90vh] overflow-auto cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={panel}
          drag
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.y) > 160 || Math.abs(info.velocity.y) > 900) onClose();
          }}
        >
          <WalletPanel
            addressShort={shortAddress}
            balanceEth={balanceEth}
            priceUsd={priceUsd}
            onCopy={copyAddress}
            onRefresh={fetchOnchain}
            onDisconnect={async () => {
              await logout();
              onClose();
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import React from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { BiWallet } from "react-icons/bi";
import Image from "next/image";
import { createPublicClient, http, formatEther, parseAbi, Address } from "viem";

const BASE_RPC = "https://base-rpc.publicnode.com";
const CHAINLINK_ETH_USD: Address = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"; // Base

const publicClient = createPublicClient({ transport: http(BASE_RPC) });

interface WalletMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletMenu({ isOpen, onClose }: WalletMenuProps) {
  const { user, logout } = usePrivy();
  const [copied, setCopied] = React.useState(false);
  const [ethBalance, setEthBalance] = React.useState<string | null>(null);
  const [ethPrice, setEthPrice] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  const address = user?.wallet?.address as Address | undefined;
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchOnchain = React.useCallback(async () => {
    if (!address) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [address]);

  React.useEffect(() => {
    if (isOpen && address) fetchOnchain();
  }, [isOpen, address, fetchOnchain]);

  if (!isOpen) return null;

  const usd = ethBalance && ethPrice ? (Number(ethBalance) * ethPrice).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-800/90 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 ring-1 ring-orange-500/30">
              <BiWallet className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Wallet</h2>
              <p className="text-sm text-white/60">Manage your account</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">×</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">Address</h3>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex-1">
                <p className="text-sm text-white/60">Connected Wallet</p>
                <p className="font-mono text-white">{shortAddress}</p>
              </div>
              <button onClick={copyAddress} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors" title="Copy address">
                <span className={`text-xs ${copied ? "text-green-400" : "text-white/70"}`}>⧉</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">Balance</h3>
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300">ETH on Base</p>
                  <p className="text-2xl font-bold text-white">{loading ? "…" : ethBalance ? `${Number(ethBalance).toFixed(4)} ETH` : "0.0000 ETH"}</p>
                  <p className="text-sm text-orange-200/80">{usd ? `$${usd} USD` : ""}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20">
                  <Image src="/block_head.png" alt="Wallet" width={24} height={24} />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button onClick={fetchOnchain} disabled={loading} className="rounded-lg px-3 py-1.5 text-sm text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button>
              </div>
            </div>
          </div>

          {user?.email && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">Account</h3>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-white/60">Email</p>
                <p className="text-white">{user.email.address}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-white/10">
            <button onClick={async () => { await logout(); onClose(); }} className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors border border-red-500/30">
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

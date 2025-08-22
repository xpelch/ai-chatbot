import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { HiLightningBolt } from "react-icons/hi";
import { AVATAR_IMG } from "./lib";
import { parseTopGainers, parseWalletSummary, parseGasSummary } from "./cardParsers";
import StatCard from "./StatCard";

export default function Bubble({ role, content, userAvatar }: { role: "user" | "assistant" | "system" | "error"; content: string; userAvatar: string }) {
  const isUser = role === "user";
  const isError = role === "error";
  const isSystem = role === "system";

  const base =
    "w-full rounded-3xl px-4 py-3 text-[15px] leading-relaxed break-words shadow-lg";
  const style = isUser
    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
    : isError
    ? "bg-red-500/10 text-red-200 ring-1 ring-red-500/50"
    : isSystem
    ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/50"
    : "bg-white/10 text-white ring-1 ring-white/20";

  const grid = isUser
    ? "grid grid-cols-[1fr_56px] items-end gap-3"
    : "grid grid-cols-[56px_1fr] items-end gap-3";

  // Detect special content cards
  const wallet = !isUser && !isError && !isSystem ? parseWalletSummary(content) : null;
  const gainers = !isUser && !isError && !isSystem ? parseTopGainers(content) : null;
  const gas = !isUser && !isError && !isSystem ? parseGasSummary(content) : null;

  // If it's a special card, render it directly without the bubble wrapper
  if (wallet || gainers || gas) {
    return (
      <div className={grid}>
        {!isUser ? (
          <div className="col-start-1 col-end-2">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl ring-1 ring-white/15">
              <Image src={AVATAR_IMG} alt="AI Agent" width={56} height={56} className="object-cover" />
            </div>
          </div>
        ) : null}

        <div className={isUser ? "col-start-1 col-end-2 justify-self-end" : "col-start-2 col-end-3 justify-self-start"}>
          {wallet ? (
            <StatCard title={wallet.title} subtitle={wallet.addressShort}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-zinc-400 text-xs">ETH</p>
                  <p className="text-xl font-bold text-white">{wallet.balanceEth.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">Price</p>
                  <p className="text-lg font-semibold text-green-400">${wallet.priceUsd.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">Value</p>
                  <p className="text-lg font-semibold text-white">${wallet.valueUsd.toFixed(2)}</p>
                </div>
              </div>
            </StatCard>
          ) : gainers ? (
            <StatCard title={gainers.title}>
              <div className="space-y-3">
                {gainers.items.map((it) => {
                  const isDown = it.changeText?.trim().startsWith("-");
                  const changeClass = isDown ? "text-red-400" : "text-green-400";
                  return (
                    <div key={it.index} className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                      <span className="text-sm font-semibold text-white">{it.index}.</span>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 truncate">
                          <span className="text-sm font-semibold text-white truncate">{it.symbolPair}</span>
                          {it.priceText && (
                            <span className="text-xs text-zinc-400 whitespace-nowrap">{it.priceText}</span>
                          )}
                          {it.changeText && (
                            <span className={`text-xs font-semibold ${changeClass} whitespace-nowrap`}>
                              {it.changeText}
                            </span>
                          )}
                        </div>
                      </div>
                      {it.url && (
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 transition"
                        >
                          Open
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </StatCard>
          ) : gas ? (
            <StatCard title={gas.title}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-zinc-400 text-xs">{gas.low.label}</p>
                  <p className="text-sm font-semibold text-green-400 flex items-center justify-center gap-1">
                    <HiLightningBolt className="w-3 h-3 -mt-1" />
                    {gas.low.maxFeeGwei.toFixed(1)} gwei
                  </p>
                  <p className="text-xs text-zinc-500">tip {gas.low.tipGwei.toFixed(1)} gwei</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">{gas.standard.label}</p>
                  <p className="text-sm font-semibold text-orange-400 flex items-center justify-center gap-1">
                    <HiLightningBolt className="w-3 h-3 -mt-1" />
                    {gas.standard.maxFeeGwei.toFixed(1)} gwei
                  </p>
                  <p className="text-xs text-zinc-500">tip {gas.standard.tipGwei.toFixed(1)} gwei</p>
                </div>
                <div>
                  <p className="text-zinc-400 text-xs">{gas.fast.label}</p>
                  <p className="text-sm font-semibold text-red-400 flex items-center justify-center gap-1">
                    <HiLightningBolt className="w-3 h-3 -mt-1" />
                    {gas.fast.maxFeeGwei.toFixed(1)} gwei
                  </p>
                  <p className="text-xs text-zinc-500">tip {gas.fast.tipGwei.toFixed(1)} gwei</p>
                </div>
              </div>
            </StatCard>
          ) : null}
        </div>

        {isUser ? (
          <div className="col-start-2 col-end-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/15 overflow-hidden">
              <Image src={userAvatar} alt="User" width={48} height={48} className="object-cover" />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Regular chat bubble for markdown content
  return (
    <div className={grid}>
      {!isUser ? (
        <div className="col-start-1 col-end-2">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl ring-1 ring-white/15">
            <Image src={AVATAR_IMG} alt="AI Agent" width={56} height={56} className="object-cover" />
          </div>
        </div>
      ) : null}

      <div
        className={
          (isUser ? "col-start-1 col-end-2 justify-self-end" : "col-start-2 col-end-3 justify-self-start")
        }
      >
        <div className={`${base} ${style}`}>
          <div className="prose prose-invert prose-sm max-w-none prose-li:marker:text-white/80 prose-ol:text-white prose-ul:text-white prose-li:my-0 prose-ul:my-2 prose-ol:my-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_code]:text-orange-200 [&_pre]:bg-black/30 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre_code]:text-[13px] [&_code]:rounded [&_code]:bg-black/30 [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-w-full [&_pre_code]:break-words [&_code]:break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeSanitize]}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {isUser ? (
        <div className="col-start-2 col-end-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/15 overflow-hidden">
            <Image src={userAvatar} alt="User" width={48} height={48} className="object-cover" />
          </div>
        </div>
      ) : null}
    </div>
  );
}



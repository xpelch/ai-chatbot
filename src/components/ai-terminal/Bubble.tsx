import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { AVATAR_IMG } from "./lib";
import { parseTopGainers, parseWalletSummary, parseGasSummary } from "./cardParsers";

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
          {isUser ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : wallet ? (
            <div className="rounded-2xl overflow-hidden ring-1 ring-orange-500/30 bg-zinc-900/60">
              <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 px-4 py-2 border-b border-orange-500/30">
                <div className="text-orange-200 text-sm font-semibold">{wallet.title}</div>
                {wallet.addressShort && (<div className="text-orange-200/80 text-xs">{wallet.addressShort}</div>)}
              </div>
              <div className="px-4 py-3 text-white/90 text-sm">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-white/60 text-xs">ETH</div>
                    <div className="font-semibold">{wallet.balanceEth.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">Price</div>
                    <div className="font-semibold">${wallet.priceUsd.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">Value</div>
                    <div className="font-semibold">${wallet.valueUsd.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : gainers ? (
            <div className="rounded-2xl overflow-hidden ring-1 ring-orange-500/30 bg-zinc-900/60">
              <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 px-4 py-2 border-b border-orange-500/30">
                <div className="text-orange-200 text-sm font-semibold">{gainers.title}</div>
              </div>
              <div className="px-4 py-2 text-white/90 text-sm">
                <ul className="space-y-1">
                  {gainers.items.map((it) => (
                    <li key={it.index} className="flex items-center justify-between gap-3">
                      <div className="truncate">
                        <span className="font-semibold">{it.index}. {it.symbolPair}</span>
                        {it.priceText && <span className="text-white/70"> — {it.priceText}</span>}
                        {it.changeText && <span className="ml-1 text-white/60">({it.changeText})</span>}
                      </div>
                      {it.url && (
                        <a href={it.url} target="_blank" rel="noreferrer" className="text-orange-300 hover:text-orange-200 text-xs whitespace-nowrap">Open</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : gas ? (
            <div className="rounded-2xl overflow-hidden ring-1 ring-orange-500/30 bg-zinc-900/60">
              <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 px-4 py-2 border-b border-orange-500/30">
                <div className="text-orange-200 text-sm font-semibold">{gas.title}</div>
              </div>
              <div className="px-4 py-3 text-white/90 text-sm">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-white/60 text-xs">{gas.low.label}</div>
                    <div className="font-semibold">maxFee {gas.low.maxFeeGwei.toFixed(1)} gwei</div>
                    <div className="text-white/70 text-xs">tip {gas.low.tipGwei.toFixed(1)} gwei</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">{gas.standard.label}</div>
                    <div className="font-semibold">maxFee {gas.standard.maxFeeGwei.toFixed(1)} gwei</div>
                    <div className="text-white/70 text-xs">tip {gas.standard.tipGwei.toFixed(1)} gwei</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-xs">{gas.fast.label}</div>
                    <div className="font-semibold">maxFee {gas.fast.maxFeeGwei.toFixed(1)} gwei</div>
                    <div className="text-white/70 text-xs">tip {gas.fast.tipGwei.toFixed(1)} gwei</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-li:marker:text-white/80 prose-ol:text-white prose-ul:text-white prose-li:my-0 prose-ul:my-2 prose-ol:my-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_code]:text-orange-200 [&_pre]:bg-black/30 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre_code]:text-[13px] [&_code]:rounded [&_code]:bg-black/30 [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:max-w-full [&_pre_code]:break-words [&_code]:break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeSanitize]}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
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



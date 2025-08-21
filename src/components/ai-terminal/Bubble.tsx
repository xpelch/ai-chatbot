import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { AVATAR_IMG } from "./lib";

export default function Bubble({ role, content, userAvatar }: { role: "user" | "assistant" | "system" | "error"; content: string; userAvatar: string }) {
  const isUser = role === "user";
  const isError = role === "error";
  const isSystem = role === "system";

  const base =
    "max-w-[75ch] rounded-3xl px-4 py-3 text-[15px] leading-relaxed break-words shadow-lg";
  const style = isUser
    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
    : isError
    ? "bg-red-500/10 text-red-200 ring-1 ring-red-500/50"
    : isSystem
    ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/50"
    : "bg-white/10 text-white ring-1 ring-white/20";

  return (
    <div className="grid grid-cols-[56px_1fr_56px] items-end gap-3">
      {!isUser ? (
        <div className="col-start-1 col-end-2">
                     <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl ring-1 ring-white/15">
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
          {isUser ? (
            <div className="whitespace-pre-wrap">{content}</div>
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
        <div className="col-start-3 col-end-4">
                     <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/15 overflow-hidden">
            <Image src={userAvatar} alt="User" width={48} height={48} className="object-cover" />
          </div>
        </div>
      ) : (
        <div className="col-start-3 col-end-4" />
      )}
    </div>
  );
}



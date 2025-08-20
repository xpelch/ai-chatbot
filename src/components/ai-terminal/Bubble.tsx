import Image from "next/image";
import { AVATAR_IMG } from "./lib";

export default function Bubble({ role, content, userAvatar }: { role: "user" | "assistant" | "system" | "error"; content: string; userAvatar: string }) {
  const isUser = role === "user";
  const isError = role === "error";
  const isSystem = role === "system";

  const base =
    "max-w-[75ch] rounded-2xl px-4 py-3 text-[15px] leading-relaxed break-words shadow-lg";
  const style = isUser
    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
    : isError
    ? "bg-red-500/10 text-red-200 ring-1 ring-red-500/50"
    : isSystem
    ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/50"
    : "bg-white/5 text-white ring-1 ring-white/20";

  return (
    <div className="grid grid-cols-[56px_1fr_56px] items-end gap-3">
      {!isUser ? (
        <div className="col-start-1 col-end-2">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/15">
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
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>

      {isUser ? (
        <div className="col-start-3 col-end-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 overflow-hidden">
            <Image src={userAvatar} alt="User" width={48} height={48} className="object-cover" />
          </div>
        </div>
      ) : (
        <div className="col-start-3 col-end-4" />
      )}
    </div>
  );
}



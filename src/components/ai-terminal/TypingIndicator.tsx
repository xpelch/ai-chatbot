import Image from "next/image";
import { AVATAR_IMG } from "./lib";

export default function TypingIndicator() {
  return (
    <div className="grid grid-cols-[56px_1fr_56px] items-end gap-3">
      <div className="col-start-1 col-end-2">
                   <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl ring-1 ring-white/15">
          <Image src={AVATAR_IMG} alt="AI Agent" width={56} height={56} className="object-cover" />
        </div>
      </div>
      <div className="col-start-2 col-end-3">
        <div className="flex h-10 items-end gap-1 pb-1 text-white/60">
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:-0.2s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white/50 [animation-delay:0.2s]" />
        </div>
      </div>
      <div className="col-start-3 col-end-4" />
    </div>
  );
}



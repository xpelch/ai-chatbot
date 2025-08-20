import React from "react";

export default function GlassCard(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        "rounded-3xl border border-white/10 bg-zinc-800/40 " +
        "backdrop-blur supports-[backdrop-filter]:bg-zinc-800/30 shadow-2xl shadow-black/20 " +
        (props.className ?? "")
      }
    >
      {props.children}
    </div>
  );
}



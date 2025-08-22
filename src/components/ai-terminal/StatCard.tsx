import React from "react";

export default function StatCard({
  title,
  subtitle,
  className,
  children,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  className?: string;
}>) {
  return (
    <div
      className={
        "rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-md " +
        (className ?? "")
      }
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {subtitle && (
        <div className="px-4 pt-2">
          <div className="text-[11px] text-zinc-500">{subtitle}</div>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}



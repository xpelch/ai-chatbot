import React from "react";
import { BiSolidSend } from "react-icons/bi";

export default function Composer({
  value,
  disabled,
  onChange,
  onSubmit,
  onEnterSend,
  placeholder,
}: {
  value: string;
  disabled: boolean;
  onChange: (s: string) => void;
  onSubmit: () => void;
  onEnterSend: () => void;
  placeholder: string;
}) {
  const handleSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnterSend();
    }
  };

  return (
    <div className="border-t border-white/10 bg-black/30">
      <form
        onSubmit={handleSubmit}
        className="mx-auto grid max-w-4xl grid-cols-[1fr_auto] items-stretch gap-3 px-4 py-4"
      >
        <div className="relative">
          <textarea
            rows={1}
            disabled={disabled}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="block w-full resize-none rounded-2xl border border-white/20 bg-white/5 px-4 py-3 pr-12 text-[15px] text-white outline-none transition focus:ring-2 focus:ring-orange-400/30 min-h-[56px] max-h-[200px]"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">
            ↵
          </div>
        </div>

        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="self-stretch rounded-2xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center min-w-[96px]"
        >
          <BiSolidSend className="h-5 w-5 text-white" />
        </button>
      </form>
    </div>
  );
}



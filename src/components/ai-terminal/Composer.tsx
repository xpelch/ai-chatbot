import React from "react";
import { BiSolidSend } from "react-icons/bi";
import { TbTrashFilled } from "react-icons/tb";

export default function Composer({
  value,
  disabled,
  onChange,
  onSubmit,
  onEnterSend,
  onClear,
  placeholder,
}: {
  value: string;
  disabled: boolean;
  onChange: (s: string) => void;
  onSubmit: () => void;
  onEnterSend: () => void;
  onClear: () => void;
  placeholder: string;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const clearBtnRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
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

  React.useEffect(() => {
    if (!confirmOpen) return;
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        !popoverRef.current?.contains(target) &&
        !clearBtnRef.current?.contains(target)
      ) {
        setConfirmOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [confirmOpen]);

  return (
    <div className="border-t border-white/10 bg-black/20">
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

        <div className="relative flex items-center gap-2">
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="self-stretch rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center min-w-[56px]"
          >
            <BiSolidSend className="h-5 w-5 text-white" />
          </button>
          <button
            ref={clearBtnRef}
            type="button"
            disabled={disabled}
            onClick={() => setConfirmOpen((o) => !o)}
            className="self-stretch rounded-xl border border-red-500/50 bg-red-500/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500/40 disabled:opacity-50 flex items-center justify-center min-w-[56px]"
            aria-haspopup="dialog"
            aria-expanded={confirmOpen}
            aria-controls="clear-confirm-popover"
          >
            <TbTrashFilled className="h-5 w-5 text-white" />
          </button>
          {confirmOpen && (
            <div
              id="clear-confirm-popover"
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              className="absolute right-0 bottom-full mb-2 w-[260px] rounded-3xl border border-white/10 bg-zinc-900/95 p-3 text-white shadow-xl ring-1 ring-white/10"
            >
              <div className="text-sm text-white/90">Clear the conversation? This cannot be undone.</div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                                     className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    onClear();
                  }}
                                     className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                  autoFocus
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}



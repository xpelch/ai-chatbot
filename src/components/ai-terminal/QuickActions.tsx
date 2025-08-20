export default function QuickActions({
  prompts,
  disabled,
  onUsePrompt,
  onClear,
}: {
  prompts: string[];
  disabled: boolean;
  onUsePrompt: (p: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="border-t border-white/10 bg-black/20">
      <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {prompts.map((qp) => (
          <button
            key={qp}
            disabled={disabled}
            onClick={() => onUsePrompt(qp)}
            className="whitespace-nowrap rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50"
          >
            {qp}
          </button>
        ))}
        <div className="ml-auto">
          <button
            disabled={disabled}
            onClick={onClear}
            className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}



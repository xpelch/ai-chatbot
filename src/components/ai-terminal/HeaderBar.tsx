import Image from "next/image";
import { BiWallet } from "react-icons/bi";
import { AVATAR_IMG } from "./lib";

export default function HeaderBar({
  ready,
  authenticated,
  addr,
  onLogin,
  onWalletMenu,
  walletMenuOpen,
}: {
  ready: boolean;
  authenticated: boolean;
  addr?: string;
  onLogin: () => void;
  onWalletMenu: () => void;
  walletMenuOpen?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
                 <div className="relative h-9 w-9 overflow-hidden rounded-2xl ring-1 ring-white/15">
          <Image src={AVATAR_IMG} alt="AI Agent" width={36} height={36} className="object-cover" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">Blockhead</h1>
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/70">
            Alpha
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!ready ? (
          <div className="h-9 w-28 animate-pulse rounded-xl bg-white/5" />
        ) : authenticated ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-white/70 truncate max-w-24">{addr}</span>
            <button
              onClick={onWalletMenu}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/90 transition hover:bg-white/10 ${walletMenuOpen ? "ring-2 ring-orange-500" : ""}`}
              title="Wallet"
            >
              <BiWallet className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}
 

"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function UnlockPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Invalid password.");
        return;
      }
      router.replace(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white/10 p-6 shadow-xl ring-1 ring-white/15">
        <h1 className="mb-4 text-xl font-semibold">Enter Access Password</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mb-3 w-full rounded-xl bg-black/30 px-4 py-2 outline-none ring-1 ring-white/15 focus:ring-white/30"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {error && <div className="mb-3 text-sm text-red-300">{error}</div>}
        <button
          disabled={busy}
          onClick={submit}
          className="w-full rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-60"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}

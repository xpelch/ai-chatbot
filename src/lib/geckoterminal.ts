export type GeckoTrendingPool = {
  id: string;
  type: string;
  attributes: {
    name?: string;
    base_token_price_usd?: string;
    price_change_percentage?: { h1?: string; h6?: string; h24?: string };
    url?: string;
  };
};

type GeckoTrendingResponse = {
  data?: GeckoTrendingPool[];
};

export async function fetchTrendingPoolsGecko(opts?: {
  network?: string;
  duration?: "m5" | "m15" | "m30" | "1h" | "6h" | "24h";
  page?: number;
  includeBaseToken?: boolean;
  limit?: number;
}): Promise<GeckoTrendingPool[]> {
  const network = opts?.network ?? "base";
  const duration = opts?.duration ?? "1h";
  const page = opts?.page ?? 1;
  const includeBaseToken = opts?.includeBaseToken ?? true;
  const limit = opts?.limit ?? 5;

  const url = `https://api.geckoterminal.com/api/v2/networks/${encodeURIComponent(
    network
  )}/trending_pools?include=${includeBaseToken ? "base_token" : ""}&page=${encodeURIComponent(
    String(page)
  )}&duration=${encodeURIComponent(duration)}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Blockhead/1.0 (+https://example.com)",
    },
    cache: "no-store",
  });


  if (!res.ok && (res.status === 429 || res.status >= 500)) {
    await new Promise((r) => setTimeout(r, 300));
    const retry = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Blockhead/1.0 (+https://example.com)" },
      cache: "no-store",
    });
    if (!retry.ok) throw new Error(`gecko trending http ${retry.status}`);
    const dataRetry = (await retry.json()) as GeckoTrendingResponse;
    return (dataRetry.data ?? []).slice(0, limit);
  }

  if (!res.ok) throw new Error(`gecko trending http ${res.status}`);
  const data = (await res.json()) as GeckoTrendingResponse;
  return (data.data ?? []).slice(0, limit);
}

export function formatGeckoTrendingForChat(pools: GeckoTrendingPool[], duration: "1h" | "6h" | "24h" = "1h"): string {
  if (!pools || pools.length === 0) return "Top gainers: No trending pools found right now.";
  const lines = pools.map((p, i) => {
    const name = p.attributes?.name ?? "?";
    const priceUsd = p.attributes?.base_token_price_usd ? Number(p.attributes.base_token_price_usd) : undefined;
    const changeObj = p.attributes?.price_change_percentage ?? {};
    const rawChange = (duration === "1h" ? changeObj.h1 : duration === "6h" ? changeObj.h6 : changeObj.h24) ?? undefined;
    const chNum = rawChange !== undefined ? Number(rawChange) : undefined;
    const priceText = priceUsd !== undefined && Number.isFinite(priceUsd) ? `$${priceUsd.toFixed(6)}` : "?";
    const changeText = chNum !== undefined && Number.isFinite(chNum) ? `${chNum.toFixed(1)}%` : "?%";
    return `${i + 1}. ${name} — ${priceText} (${changeText})`;
  });
  return ["Top gainers (trending):", ...lines].join("\n");
}



export type WalletSummaryData = {
  title: string;
  addressShort?: string;
  balanceEth: number;
  priceUsd: number;
  valueUsd: number;
};

export function parseWalletSummary(content: string): WalletSummaryData | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("**My bags — Base**")) return null;

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim());
  const title = lines[0].replace(/\*\*/g, "");
  const addrLine = lines[1] && lines[1].startsWith("`") ? lines[1] : undefined;
  const addressShort = addrLine ? addrLine.replace(/`/g, "").trim() : undefined;

  let balanceEth = NaN;
  let priceUsd = NaN;
  let valueUsd = NaN;

  for (const l of lines) {
    if (l.toLowerCase().includes("eth")) {
      const m = l.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (m) balanceEth = Number(m[1]);
    } else if (l.toLowerCase().includes("price")) {
      const m = l.match(/\$([0-9]+(?:\.[0-9]+)?)/);
      if (m) priceUsd = Number(m[1]);
    } else if (l.toLowerCase().includes("value")) {
      const m = l.match(/\$([0-9]+(?:\.[0-9]+)?)/);
      if (m) valueUsd = Number(m[1]);
    }
  }

  if (!Number.isFinite(balanceEth)) balanceEth = 0;
  if (!Number.isFinite(priceUsd)) priceUsd = 0;
  if (!Number.isFinite(valueUsd)) valueUsd = 0;

  return { title, addressShort, balanceEth, priceUsd, valueUsd };
}

export type TopGainerItem = {
  index: number;
  symbolPair: string;
  priceText?: string;
  changeText?: string;
  url?: string;
};

export type TopGainersData = {
  title: string;
  items: TopGainerItem[];
};

export function parseTopGainers(content: string): TopGainersData | null {
  const trimmed = content.trim();
  if (!/^top gainers/i.test(trimmed)) return null;
  const lines = trimmed.split(/\r?\n/);
  const title = lines[0];
  const items: TopGainerItem[] = [];
  for (const l of lines.slice(1)) {
    // Expect: "1. ABC/USDC — $0.123 (12.3%) — https://..."
    const m = l.match(/^(\d+)\.\s+([^—]+?)\s+—\s+([^—]*?)\s*(?:—\s*(.+))?$/);
    if (!m) continue;
    const index = Number(m[1]);
    const symbolPair = m[2].trim();
    const priceAndChange = m[3].trim();
    const url = m[4]?.trim();
    let priceText: string | undefined;
    let changeText: string | undefined;
    const cm = priceAndChange.match(/^(\$[^\s]+)\s*\(([^\)]+)\)/);
    if (cm) {
      priceText = cm[1];
      changeText = cm[2];
    } else {
      priceText = priceAndChange || undefined;
    }
    items.push({ index, symbolPair, priceText, changeText, url });
  }
  if (items.length === 0) return null;
  return { title, items };
}

export type GasTier = {
  label: "Low" | "Standard" | "Fast";
  maxFeeGwei: number;
  tipGwei: number;
};

export type GasSummaryData = {
  title: string; // e.g., "Gas (Base):"
  low: GasTier;
  standard: GasTier;
  fast: GasTier;
};

export function parseGasSummary(content: string): GasSummaryData | null {
  const lines = content.trim().split(/\r?\n/).map((l) => l.trim().replace(/^[-•]\s+/, ""));
  if (lines.length === 0) return null;
  const header = lines[0];
  if (!/^gas\s*\(/i.test(header)) return null;

  const parseTier = (label: "Low" | "Standard" | "Fast"): GasTier | null => {
    const row = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase() + ":"));
    if (!row) return null;
    const m = row.match(/maxFee\s+([0-9]+(?:\.[0-9]+)?)\s*gwei\s*,\s*tip\s+([0-9]+(?:\.[0-9]+)?)\s*gwei/i);
    if (!m) return null;
    return { label, maxFeeGwei: Number(m[1]), tipGwei: Number(m[2]) };
  };

  const low = parseTier("Low");
  const standard = parseTier("Standard");
  const fast = parseTier("Fast");
  if (!low || !standard || !fast) return null;
  return { title: header.replace(/\s*$/, ""), low, standard, fast };
}



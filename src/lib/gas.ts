import { createPublicClient, http } from "viem";

const BASE_RPC = "https://base-rpc.publicnode.com";
const client = createPublicClient({ transport: http(BASE_RPC) });

export type GasSuggestion = {
  label: "low" | "standard" | "fast";
  maxFeeGwei: number;
  maxPriorityGwei: number;
};

export async function fetchGasSuggestions(): Promise<{
  low: GasSuggestion;
  standard: GasSuggestion;
  fast: GasSuggestion;
}> {
  // Primary: EIP-1559 estimation via viem
  const fees = await client.estimateFeesPerGas().catch(() => null);

  if (fees && "maxFeePerGas" in fees && "maxPriorityFeePerGas" in fees) {
    const base = Number(fees.maxFeePerGas) / 1e9; // gwei
    const tip = Number(fees.maxPriorityFeePerGas) / 1e9; // gwei

    const low: GasSuggestion = {
      label: "low",
      maxFeeGwei: Math.max(base * 0.95, base - 0.2),
      maxPriorityGwei: Math.max(tip * 0.8, tip - 0.2),
    };
    const standard: GasSuggestion = {
      label: "standard",
      maxFeeGwei: base,
      maxPriorityGwei: tip,
    };
    const fast: GasSuggestion = {
      label: "fast",
      maxFeeGwei: base * 1.2 + 0.5,
      maxPriorityGwei: tip * 1.2 + 0.2,
    };
    return {
      low: roundSuggestion(low),
      standard: roundSuggestion(standard),
      fast: roundSuggestion(fast),
    };
  }

  // Fallback: legacy gas price
  const gasPriceWei = await client.getGasPrice();
  const gwei = Number(gasPriceWei) / 1e9;
  const low: GasSuggestion = { label: "low", maxFeeGwei: gwei * 0.95, maxPriorityGwei: Math.max(gwei * 0.2, 0.2) };
  const standard: GasSuggestion = { label: "standard", maxFeeGwei: gwei, maxPriorityGwei: Math.max(gwei * 0.3, 0.3) };
  const fast: GasSuggestion = { label: "fast", maxFeeGwei: gwei * 1.2 + 0.5, maxPriorityGwei: Math.max(gwei * 0.4 + 0.2, 0.5) };
  return {
    low: roundSuggestion(low),
    standard: roundSuggestion(standard),
    fast: roundSuggestion(fast),
  };
}

function roundSuggestion(s: GasSuggestion): GasSuggestion {
  return {
    label: s.label,
    maxFeeGwei: Math.max(0, Math.round(s.maxFeeGwei * 10) / 10),
    maxPriorityGwei: Math.max(0, Math.round(s.maxPriorityGwei * 10) / 10),
  };
}

export function formatGasSuggestionsForChat(s: {
  low: GasSuggestion;
  standard: GasSuggestion;
  fast: GasSuggestion;
}): string {
  const fmt = (g: GasSuggestion) => `maxFee ${g.maxFeeGwei.toFixed(1)} gwei, tip ${g.maxPriorityGwei.toFixed(1)} gwei`;
  return [
    "Gas (Base):",
    `- Low: ${fmt(s.low)}`,
    `- Standard: ${fmt(s.standard)}`,
    `- Fast: ${fmt(s.fast)}`,
  ].join("\n");
}



import { fetchTrendingPoolsGecko, formatGeckoTrendingForChat } from "@/lib/geckoterminal";
import { fetchGasSuggestions, formatGasSuggestionsForChat } from "@/lib/gas";

export async function resolveLocalCommand(prompt: string): Promise<string | null> {
  const lower = prompt.trim().toLowerCase();

  if (lower === "help") return handleHelp();
  if (lower.startsWith("echo ")) return handleEcho(prompt);
  if (lower === "time") return handleTime();
  if (lower === "gas now" || lower === "gas" || lower === "gas?") return handleGas();
  if (lower.startsWith("flip a coin") || lower === "flip") return handleFlip();
  if (lower.startsWith("top gainers")) return handleTopGainers();

  return null;
}

function handleHelp(): string {
  return [
    "Available commands (Markdown/HTML supported):",
    "",
    "- help: Show this help",
    "- echo <text>: Echo back text",
    "- time: Show server time (local and UTC)",
    "- gas now: Current gas estimate (Base)",
    "- flip a coin: Random yes/no (for science)",
    "- top gainers: Dex trending snapshot",
  ].join("\n");
}

function handleEcho(prompt: string): string {
  return prompt.slice(5);
}

function handleTime(): string {
  const now = new Date();
  const local = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "long" }).format(now);
  const utc = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "long", timeZone: "UTC" }).format(now);
  return `Local: ${local}\nUTC: ${utc}`;
}

async function handleGas(): Promise<string> {
  try {
    const s = await fetchGasSuggestions();
    return formatGasSuggestionsForChat(s);
  } catch {
    return "Gas (Base): unable to fetch right now. Try again in a bit.";
  }
}

function handleFlip(): string {
  const heads = Math.random() < 0.5;
  return heads ? "Heads — send it." : "Tails — maybe wait a candle.";
}

async function handleTopGainers(): Promise<string> {
  try {
    const pools = await fetchTrendingPoolsGecko({ network: "base", duration: "1h", page: 1, includeBaseToken: true, limit: 5 });
    return formatGeckoTrendingForChat(pools, "1h");
  } catch {
    return "Top gainers: API not reachable. Try again later.";
  }
}



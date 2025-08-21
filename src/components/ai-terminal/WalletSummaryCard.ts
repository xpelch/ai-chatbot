export function buildWalletSummaryCard(params: {
  address: string;
  shortAddress: string | undefined;
  balanceEth: number;
  priceUsd: number;
  valueUsd: number;
}): string {
  const { shortAddress, balanceEth, priceUsd, valueUsd } = params;
  return [
    "**My bags — Base**",
    shortAddress ? `\`${shortAddress}\`` : "",
    "",
    `- **ETH**: ${balanceEth.toFixed(4)}`,
    `- **Price**: $${priceUsd.toFixed(2)}`,
    `- **Value**: $${valueUsd.toFixed(2)}`,
  ]
    .filter(Boolean)
    .join("\n");
}



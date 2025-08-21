import { NextRequest } from "next/server";
import { Address, isAddress } from "viem";
import { fetchBaseEthBalance, fetchBaseEthUsdPrice } from "@/lib/wallet";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const address =
      typeof body === "object" && body !== null && "address" in body
        ? String((body as { address?: unknown }).address)
        : "";

    if (!isAddress(address)) {
      return Response.json({ error: "Invalid address" }, { status: 400 });
    }

    const [balanceEth, priceUsd] = await Promise.all([
      fetchBaseEthBalance(address as Address),
      fetchBaseEthUsdPrice(),
    ]);

    const usdValue = balanceEth * priceUsd;

    return Response.json({
      chain: "base",
      address,
      eth: {
        balance: balanceEth,
        priceUsd,
        valueUsd: usdValue,
      },
      ts: Date.now(),
    });
  } catch (err) {
    const message =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message)
        : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}



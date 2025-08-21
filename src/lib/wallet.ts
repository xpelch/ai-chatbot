import { Address, createPublicClient, formatEther, http, parseAbi } from "viem";

const BASE_RPC = "https://base-rpc.publicnode.com";
const CHAINLINK_ETH_USD = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70" as Address; // Base

const publicClient = createPublicClient({ transport: http(BASE_RPC) });

export async function fetchBaseEthBalance(address: Address): Promise<number> {
  const wei = await publicClient.getBalance({ address });
  return Number(formatEther(wei));
}

export async function fetchBaseEthUsdPrice(): Promise<number> {
  const [lrData, decimals] = await Promise.all([
    publicClient.readContract({
      address: CHAINLINK_ETH_USD,
      abi: parseAbi([
        "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
      ]),
      functionName: "latestRoundData",
    }),
    publicClient.readContract({
      address: CHAINLINK_ETH_USD,
      abi: parseAbi(["function decimals() view returns (uint8)"]),
      functionName: "decimals",
    }) as Promise<number>,
  ]);
  const arr = lrData as readonly unknown[];
  const answerBig = arr[1] as bigint;
  const price = Number(answerBig) / 10 ** Number(decimals);
  return price;
}



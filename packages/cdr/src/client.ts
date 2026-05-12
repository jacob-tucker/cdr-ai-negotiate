import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CDRClient, initWasm } from "@piplabs/cdr-sdk";

let wasmReady: Promise<void> | null = null;
function ensureWasm() {
  if (!wasmReady) wasmReady = initWasm();
  return wasmReady;
}

const aeneid = {
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: ["https://aeneid.storyrpc.io"] } },
} as const;

export interface CdrClientOptions {
  rpcUrl: string;
  privateKey?: Hex;
}

export async function makeCdrClient(opts: CdrClientOptions) {
  await ensureWasm();

  const publicClient = createPublicClient({
    chain: aeneid,
    transport: http(opts.rpcUrl),
  });

  const walletClient = opts.privateKey
    ? createWalletClient({
        account: privateKeyToAccount(opts.privateKey),
        chain: aeneid,
        transport: http(opts.rpcUrl),
      })
    : undefined;

  const client = new CDRClient({
    network: "testnet",
    publicClient,
    walletClient,
  });

  return { client, publicClient, walletClient };
}

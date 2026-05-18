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

/** Story-API REST base URL the CDR SDK queries for DKG state. */
const DEFAULT_API_URL = "http://172.192.41.96:1317";

export interface CdrClientOptions {
  rpcUrl: string;
  privateKey?: Hex;
  /** Defaults to `STORY_API_URL` env var, then the testnet endpoint. */
  apiUrl?: string;
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
    apiUrl: opts.apiUrl ?? process.env.STORY_API_URL ?? DEFAULT_API_URL,
  });

  return { client, publicClient, walletClient };
}

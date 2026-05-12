import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { type Hex } from "viem";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env") });

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.DATA_OWNER_AGENT_PORT ?? 3001),
  publicUrl: process.env.DATA_OWNER_AGENT_URL ?? "http://localhost:3001",
  rpcUrl: need("STORY_RPC_URL"),
  ownerPrivateKey: need("DATA_OWNER_PRIVATE_KEY") as Hex,
  datasetId: process.env.DATASET_ID ?? "health-demo-v1",
  datasetSecret: process.env.DATASET_SECRET ?? "this is the secret!",
  // Seller proposes a randomized price in [min, max], capped at 1 IP.
  sellerMinPriceIp: Number(process.env.SELLER_MIN_PRICE_IP ?? "0.4"),
  sellerMaxPriceIp: Math.min(Number(process.env.SELLER_MAX_PRICE_IP ?? "1"), 1),
};

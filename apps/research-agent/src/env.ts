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
  dataOwnerUrl: process.env.DATA_OWNER_AGENT_URL ?? "http://localhost:3001",
  rpcUrl: need("STORY_RPC_URL"),
  researchPrivateKey: need("RESEARCH_AGENT_PRIVATE_KEY") as Hex,
  maxBudgetIp: process.env.DATASET_PRICE_IP ?? "1",
};

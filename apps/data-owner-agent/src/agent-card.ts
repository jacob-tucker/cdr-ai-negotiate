import type { AgentCard } from "@a2a-js/sdk";
import { env } from "./env.js";

export function buildAgentCard(): AgentCard {
  const rpcUrl = `${env.publicUrl}/a2a/jsonrpc`;
  return {
    name: "CDR Data Owner Agent",
    description:
      "Negotiates programmable access to encrypted datasets. Registers an IP asset + license terms on demand, then unlocks data through a CDR vault.",
    protocolVersion: "0.3.0",
    version: "0.2.0",
    url: rpcUrl,
    skills: [
      {
        id: "propose-terms",
        name: "Propose Access Terms",
        description: "Returns an opening price (≤ 1 IP) and a description of the dataset.",
        tags: ["a2a", "negotiation"],
      },
      {
        id: "counter-offer",
        name: "Counter Offer",
        description:
          "Buyer proposes a lower price; seller accepts (always, for this demo) within its min/max range.",
        tags: ["a2a", "negotiation"],
      },
      {
        id: "finalize-deal",
        name: "Finalize Deal",
        description:
          "Buyer presents a signed AP2 mandate at the agreed price. Seller registers a new IP asset with commercial license terms priced at that amount, creates a CDR vault gated by license-token ownership, and returns the identifiers.",
        tags: ["a2a", "ap2", "story-protocol", "cdr"],
      },
      {
        id: "notify-mint",
        name: "Notify Mint",
        description:
          "Buyer notifies seller that the license token has been minted. Seller verifies ownership and acknowledges.",
        tags: ["a2a", "story-protocol"],
      },
    ],
    capabilities: { pushNotifications: false },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    additionalInterfaces: [{ url: rpcUrl, transport: "JSONRPC" }],
    provider: {
      organization: "CDR Demo",
      url: env.publicUrl,
    },
  };
}

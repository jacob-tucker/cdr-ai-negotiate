import type { AgentCard } from "@a2a-js/sdk";
import { env } from "./env.js";

export function buildAgentCard(): AgentCard {
  const rpcUrl = `${env.publicUrl}/a2a/jsonrpc`;
  return {
    name: "CDR Data Owner Agent",
    description:
      "Sells programmable access to encrypted datasets gated by Story Protocol licenses, granted via CDR vaults.",
    protocolVersion: "0.3.0",
    version: "0.1.0",
    url: rpcUrl,
    skills: [
      {
        id: "quote-access",
        name: "Quote CDR Access Terms",
        description: "Returns price, IP asset, and license terms for accessing a dataset.",
        tags: ["cdr", "quote", "story-protocol"],
      },
      {
        id: "request-access",
        name: "Request CDR Dataset Access",
        description:
          "Given a signed AP2 mandate and a minted license token, creates a CDR vault and returns its UUID.",
        tags: ["cdr", "access", "story-protocol", "ap2"],
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

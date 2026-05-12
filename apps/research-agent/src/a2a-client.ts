import { v4 as uuidv4 } from "uuid";
import type { AgentCard, Message } from "@a2a-js/sdk";

/**
 * Lightweight A2A JSON-RPC client — sends a single `message/send` request and
 * returns the agent's reply as a parsed JSON object from the first text part.
 * Avoids the bundler quirks of @a2a-js/sdk/client in a tsx-run script.
 */
export async function fetchAgentCard(baseUrl: string): Promise<AgentCard> {
  const tried: string[] = [];
  for (const path of ["/.well-known/agent-card.json", "/.well-known/agent.json"]) {
    const url = baseUrl.replace(/\/$/, "") + path;
    tried.push(url);
    const res = await fetch(url);
    if (res.ok) return (await res.json()) as AgentCard;
  }
  throw new Error(`No agent card found at ${tried.join(" or ")}`);
}

export async function sendJsonMessage<T>(
  rpcUrl: string,
  payload: unknown,
): Promise<T> {
  const body = {
    jsonrpc: "2.0",
    id: uuidv4(),
    method: "message/send",
    params: {
      message: {
        kind: "message",
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: JSON.stringify(payload) }],
      },
    },
  };

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`A2A call failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as {
    result?: Message;
    error?: { message: string };
  };
  if (json.error) throw new Error(`A2A error: ${json.error.message}`);
  const part = json.result?.parts?.find((p) => p.kind === "text");
  if (!part || part.kind !== "text") throw new Error("No text part in agent reply");
  return JSON.parse(part.text) as T;
}

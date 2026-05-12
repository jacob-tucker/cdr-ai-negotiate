import express from "express";
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
} from "@a2a-js/sdk/server";
import {
  agentCardHandler,
  jsonRpcHandler,
  UserBuilder,
} from "@a2a-js/sdk/server/express";
import { buildAgentCard } from "./agent-card.js";
import { DataOwnerExecutor } from "./executor.js";
import { env } from "./env.js";

const handler = new DefaultRequestHandler(
  buildAgentCard(),
  new InMemoryTaskStore(),
  new DataOwnerExecutor(),
);

const app = express();
app.use(
  "/.well-known/agent-card.json",
  agentCardHandler({ agentCardProvider: handler }),
);
app.use(
  "/.well-known/agent.json",
  agentCardHandler({ agentCardProvider: handler }),
);
app.use(
  "/a2a/jsonrpc",
  jsonRpcHandler({
    requestHandler: handler,
    userBuilder: UserBuilder.noAuthentication,
  }),
);

app.listen(env.port, () => {
  console.log(`[data-owner] listening on ${env.publicUrl}`);
  console.log(`  agent card:  ${env.publicUrl}/.well-known/agent-card.json`);
  console.log(`  jsonrpc:     ${env.publicUrl}/a2a/jsonrpc`);
});

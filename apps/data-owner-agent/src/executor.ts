import { v4 as uuidv4 } from "uuid";
import { type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type {
  AgentExecutor,
  ExecutionEventBus,
  RequestContext,
} from "@a2a-js/sdk/server";
import type { Message } from "@a2a-js/sdk";
import { verifyMandate, type SignedMandate } from "@cdr-demo/ap2-lite";
import { createLicenseGatedVault } from "@cdr-demo/cdr";
import { verifyLicenseOwner } from "@cdr-demo/story";
import { env } from "./env.js";

interface QuoteRequest {
  type: "quote-access";
  datasetId?: string;
}

interface AccessRequest {
  type: "request-access";
  datasetId: string;
  signedMandate: SignedMandate;
  licenseTokenId: string;
  requesterAddress: Address;
}

type AgentRequest = QuoteRequest | AccessRequest;

function reply(ctx: RequestContext, payload: unknown): Message {
  return {
    kind: "message",
    messageId: uuidv4(),
    role: "agent",
    parts: [{ kind: "text", text: JSON.stringify(payload) }],
    contextId: ctx.contextId,
  };
}

function parseRequest(ctx: RequestContext): AgentRequest | null {
  const part = ctx.userMessage?.parts?.find((p) => p.kind === "text");
  if (!part || part.kind !== "text") return null;
  try {
    return JSON.parse(part.text) as AgentRequest;
  } catch {
    return null;
  }
}

async function handleQuote(_req: QuoteRequest, ctx: RequestContext): Promise<Message> {
  const ownerAddress = privateKeyToAccount(env.ownerPrivateKey).address;
  return reply(ctx, {
    ok: true,
    type: "quote",
    datasetId: env.datasetId,
    ipId: env.ipId,
    licenseTermsId: env.licenseTermsId,
    price: `${env.priceIp} IP`,
    network: "story-aeneid",
    merchantAgent: ownerAddress,
    condition: "Mint a license token via Story SDK and present a signed AP2 mandate.",
  });
}

async function handleAccess(
  req: AccessRequest,
  ctx: RequestContext,
): Promise<Message> {
  const ownerAddress = privateKeyToAccount(env.ownerPrivateKey).address;

  const mandateCheck = await verifyMandate(req.signedMandate);
  if (!mandateCheck.valid) {
    return reply(ctx, { ok: false, error: `mandate invalid: ${mandateCheck.reason}` });
  }
  const m = req.signedMandate.mandate;
  if (m.ipId.toLowerCase() !== env.ipId.toLowerCase()) {
    return reply(ctx, { ok: false, error: "mandate ipId mismatch" });
  }
  if (m.licenseTermsId !== env.licenseTermsId) {
    return reply(ctx, { ok: false, error: "mandate licenseTermsId mismatch" });
  }
  if (m.merchantAgent.toLowerCase() !== ownerAddress.toLowerCase()) {
    return reply(ctx, { ok: false, error: "mandate merchantAgent mismatch" });
  }
  if (m.payerAgent.toLowerCase() !== req.requesterAddress.toLowerCase()) {
    return reply(ctx, { ok: false, error: "requesterAddress does not match mandate" });
  }

  const ownsLicense = await verifyLicenseOwner({
    rpcUrl: env.rpcUrl,
    licenseTokenId: BigInt(req.licenseTokenId),
    expectedOwner: req.requesterAddress,
  });
  if (!ownsLicense) {
    return reply(ctx, { ok: false, error: "license token not owned by requester" });
  }

  const vault = await createLicenseGatedVault({
    rpcUrl: env.rpcUrl,
    ownerPrivateKey: env.ownerPrivateKey,
    ownerAddress,
    ipId: env.ipId,
    secret: env.datasetSecret,
  });

  return reply(ctx, {
    ok: true,
    type: "access-granted",
    datasetId: env.datasetId,
    vaultUuid: vault.uuid,
    allocateTx: vault.allocateTx,
    writeTx: vault.writeTx,
    licenseTokenId: req.licenseTokenId,
    instructions:
      "Call readLicenseGatedVault with vaultUuid + licenseTokenId to decrypt.",
  });
}

export class DataOwnerExecutor implements AgentExecutor {
  async execute(ctx: RequestContext, bus: ExecutionEventBus): Promise<void> {
    const req = parseRequest(ctx);
    try {
      let msg: Message;
      if (!req) {
        msg = reply(ctx, {
          ok: false,
          error: "expected JSON text part with { type: 'quote-access' | 'request-access', ... }",
        });
      } else if (req.type === "quote-access") {
        msg = await handleQuote(req, ctx);
      } else if (req.type === "request-access") {
        msg = await handleAccess(req, ctx);
      } else {
        msg = reply(ctx, { ok: false, error: "unknown request type" });
      }
      bus.publish(msg);
    } catch (err) {
      bus.publish(reply(ctx, { ok: false, error: (err as Error).message }));
    } finally {
      bus.finished();
    }
  }

  cancelTask = async (): Promise<void> => {};
}

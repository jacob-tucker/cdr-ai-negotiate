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
import { registerIpAndAttachTerms, verifyLicenseOwner } from "@cdr-demo/story";
import { env } from "./env.js";

interface ProposeRequest {
  type: "propose-terms";
}
interface CounterRequest {
  type: "counter-offer";
  proposedPrice: string;
}
interface FinalizeRequest {
  type: "finalize-deal";
  agreedPrice: string;
  signedMandate: SignedMandate;
  requesterAddress: Address;
}
interface NotifyRequest {
  type: "notify-mint";
  licenseTokenId: string;
  ipId: Address;
  requesterAddress: Address;
}
type AgentRequest = ProposeRequest | CounterRequest | FinalizeRequest | NotifyRequest;

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

function randomQuote(): string {
  const { sellerMinPriceIp, sellerMaxPriceIp } = env;
  const v = sellerMinPriceIp + Math.random() * (sellerMaxPriceIp - sellerMinPriceIp);
  return (Math.round(v * 100) / 100).toFixed(2);
}

async function handlePropose(_req: ProposeRequest, ctx: RequestContext): Promise<Message> {
  const ownerAddress = privateKeyToAccount(env.ownerPrivateKey).address;
  return reply(ctx, {
    ok: true,
    type: "quote",
    datasetId: env.datasetId,
    datasetDescription:
      "Confidential dataset — gated by a Story license, unlocked via a CDR threshold-encrypted vault.",
    openingPrice: randomQuote(),
    currency: "IP",
    network: "story-aeneid",
    merchantAgent: ownerAddress,
    condition: "Propose a counter (or accept). Then sign an AP2 mandate at the agreed price.",
  });
}

async function handleCounter(req: CounterRequest, ctx: RequestContext): Promise<Message> {
  const counter = Number(req.proposedPrice);
  if (!Number.isFinite(counter) || counter <= 0) {
    return reply(ctx, { ok: false, error: "invalid counter offer" });
  }
  if (counter < env.sellerMinPriceIp) {
    return reply(ctx, { ok: false, error: `counter ${counter} IP below floor ${env.sellerMinPriceIp} IP` });
  }
  if (counter > 1) {
    return reply(ctx, { ok: false, error: "counter exceeds 1 IP cap" });
  }
  return reply(ctx, {
    ok: true,
    type: "accept-counter",
    agreedPrice: counter.toFixed(2),
    currency: "IP",
  });
}

async function handleFinalize(req: FinalizeRequest, ctx: RequestContext): Promise<Message> {
  const ownerAddress = privateKeyToAccount(env.ownerPrivateKey).address;

  // 1. mandate sanity checks
  const mandateCheck = await verifyMandate(req.signedMandate);
  if (!mandateCheck.valid) {
    return reply(ctx, { ok: false, error: `mandate invalid: ${mandateCheck.reason}` });
  }
  const m = req.signedMandate.mandate;
  if (m.merchantAgent.toLowerCase() !== ownerAddress.toLowerCase()) {
    return reply(ctx, { ok: false, error: "mandate merchantAgent mismatch" });
  }
  if (m.payerAgent.toLowerCase() !== req.requesterAddress.toLowerCase()) {
    return reply(ctx, { ok: false, error: "requesterAddress does not match mandate payer" });
  }
  const agreed = Number(req.agreedPrice);
  if (!Number.isFinite(agreed) || agreed <= 0 || agreed > 1) {
    return reply(ctx, { ok: false, error: "agreedPrice must be > 0 and ≤ 1 IP" });
  }
  if (Number(m.amount) < agreed) {
    return reply(ctx, { ok: false, error: "mandate amount below agreedPrice" });
  }

  // 2. register IP + commercial license terms on-chain.
  // Use the buyer's original string (e.g. "0.61") — converting through Number
  // and back via toFixed produces float-rounding artifacts (e.g. "0.680000…049")
  // that make the on-chain fee diverge from what the buyer authorizes.
  const registered = await registerIpAndAttachTerms({
    rpcUrl: env.rpcUrl,
    sellerPrivateKey: env.ownerPrivateKey,
    mintingFeeIp: req.agreedPrice,
  });

  // 3. create CDR vault gated by license-token ownership for the new IP
  const vault = await createLicenseGatedVault({
    rpcUrl: env.rpcUrl,
    ownerPrivateKey: env.ownerPrivateKey,
    ownerAddress,
    ipId: registered.ipId,
    secret: env.datasetSecret,
  });

  return reply(ctx, {
    ok: true,
    type: "deal-finalized",
    ipId: registered.ipId,
    licenseTermsId: registered.licenseTermsId,
    ipTxHash: registered.txHash,
    vaultUuid: vault.uuid,
    allocateTx: vault.allocateTx,
    writeTx: vault.writeTx,
    datasetId: env.datasetId,
    agreedPrice: agreed.toFixed(2),
    instructions:
      "Mint a license token for ipId+licenseTermsId, then call readLicenseGatedVault(vaultUuid, tokenId).",
  });
}

async function handleNotify(req: NotifyRequest, ctx: RequestContext): Promise<Message> {
  const owns = await verifyLicenseOwner({
    rpcUrl: env.rpcUrl,
    licenseTokenId: BigInt(req.licenseTokenId),
    expectedOwner: req.requesterAddress,
  });
  if (!owns) return reply(ctx, { ok: false, error: "license token not owned by requester" });
  return reply(ctx, { ok: true, type: "mint-acknowledged", licenseTokenId: req.licenseTokenId });
}

export class DataOwnerExecutor implements AgentExecutor {
  async execute(ctx: RequestContext, bus: ExecutionEventBus): Promise<void> {
    const req = parseRequest(ctx);
    try {
      let msg: Message;
      if (!req) {
        msg = reply(ctx, { ok: false, error: "expected JSON text part with a known 'type'" });
      } else if (req.type === "propose-terms") msg = await handlePropose(req, ctx);
      else if (req.type === "counter-offer") msg = await handleCounter(req, ctx);
      else if (req.type === "finalize-deal") msg = await handleFinalize(req, ctx);
      else if (req.type === "notify-mint") msg = await handleNotify(req, ctx);
      else msg = reply(ctx, { ok: false, error: "unknown request type" });
      bus.publish(msg);
    } catch (err) {
      bus.publish(reply(ctx, { ok: false, error: (err as Error).message }));
    } finally {
      bus.finished();
    }
  }

  cancelTask = async (): Promise<void> => {};
}

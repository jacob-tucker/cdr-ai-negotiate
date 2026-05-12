import kleur from "kleur";
import { type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { newMandate, signMandate } from "@cdr-demo/ap2-lite";
import { mintLicense } from "@cdr-demo/story";
import { readLicenseGatedVault } from "@cdr-demo/cdr";
import { env } from "./env.js";
import { fetchAgentCard, sendJsonMessage } from "./a2a-client.js";

interface QuoteReply {
  ok: boolean;
  datasetId: string;
  datasetDescription: string;
  openingPrice: string;
  currency: "IP";
  merchantAgent: Address;
  condition: string;
}

interface AcceptCounterReply {
  ok: boolean;
  error?: string;
  agreedPrice: string;
}

interface FinalizeReply {
  ok: boolean;
  error?: string;
  ipId?: Address;
  licenseTermsId?: string;
  vaultUuid?: number;
  ipTxHash?: string;
  agreedPrice?: string;
}

interface NotifyReply {
  ok: boolean;
  error?: string;
}

function step(n: number, title: string) {
  console.log("");
  console.log(kleur.bold().cyan(`[${n}] ${title}`));
}
function log(label: string, value: unknown) {
  console.log(`    ${kleur.gray(label)} ${value}`);
}

async function main() {
  const researcher = privateKeyToAccount(env.researchPrivateKey);

  step(1, "Discover data-owner agent via A2A");
  const card = await fetchAgentCard(env.dataOwnerUrl);
  log("name:", kleur.white(card.name));
  log("skills:", card.skills.map((s) => s.id).join(", "));

  step(2, "Open negotiation (skill: propose-terms)");
  const quote = await sendJsonMessage<QuoteReply>(card.url, { type: "propose-terms" });
  log("dataset:", quote.datasetId);
  log("seller asks:", kleur.yellow(`${quote.openingPrice} IP`));
  log("merchantAgent:", quote.merchantAgent);

  step(3, "Send counter-offer (skill: counter-offer)");
  const sellerPrice = Number(quote.openingPrice);
  const myCounter = Math.max(0.01, Math.min(env.maxBudgetIp, sellerPrice * env.counterFactor));
  const counterPrice = myCounter.toFixed(2);
  log("buyer offers:", kleur.yellow(`${counterPrice} IP`));
  const accepted = await sendJsonMessage<AcceptCounterReply>(card.url, {
    type: "counter-offer",
    proposedPrice: counterPrice,
  });
  if (!accepted.ok) throw new Error(`counter rejected: ${accepted.error}`);
  log("seller accepts:", kleur.green(`${accepted.agreedPrice} IP`));

  step(4, "Sign AP2 mandate at the agreed price");
  const mandate = newMandate({
    payerAgent: researcher.address,
    merchantAgent: quote.merchantAgent,
    purpose: `CDR access to dataset ${quote.datasetId}`,
    // ipId/licenseTermsId not known yet — seller registers them in step 5.
    // Mandate scopes the payment by amount + merchant + dataset.
    ipId: "0x0000000000000000000000000000000000000000",
    licenseTermsId: "pending",
    amount: accepted.agreedPrice,
    currency: "IP",
    network: "story-aeneid",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    allowedAction: "mint-license-and-grant-cdr-access",
  });
  const signed = await signMandate(mandate, env.researchPrivateKey);
  log("mandateId:", mandate.mandateId);
  log("signature:", signed.signature.slice(0, 18) + "…");

  step(5, "Finalize: seller registers IP + terms + vault (skill: finalize-deal)");
  const finalized = await sendJsonMessage<FinalizeReply>(card.url, {
    type: "finalize-deal",
    agreedPrice: accepted.agreedPrice,
    signedMandate: signed,
    requesterAddress: researcher.address,
  });
  if (!finalized.ok) throw new Error(`finalize failed: ${finalized.error}`);
  log("ipId:", finalized.ipId!);
  log("licenseTermsId:", finalized.licenseTermsId!);
  log("vaultUuid:", finalized.vaultUuid!);
  log("ipTxHash:", finalized.ipTxHash!);

  step(6, "Mint license token (Story)");
  const mint = await mintLicense({
    rpcUrl: env.rpcUrl,
    buyerPrivateKey: env.researchPrivateKey,
    ipId: finalized.ipId!,
    licenseTermsId: finalized.licenseTermsId!,
    maxMintingFeeIp: accepted.agreedPrice,
  });
  const licenseTokenId = mint.licenseTokenIds[0];
  if (!licenseTokenId) throw new Error("no license token minted");
  log("txHash:", mint.txHash);
  log("licenseTokenId:", licenseTokenId.toString());

  step(7, "Notify seller of mint (skill: notify-mint)");
  const ack = await sendJsonMessage<NotifyReply>(card.url, {
    type: "notify-mint",
    licenseTokenId: licenseTokenId.toString(),
    ipId: finalized.ipId!,
    requesterAddress: researcher.address,
  });
  if (!ack.ok) throw new Error(`notify failed: ${ack.error}`);
  log("seller:", kleur.green("acknowledged"));

  step(8, "Decrypt CDR vault using license token");
  const secret = await readLicenseGatedVault({
    rpcUrl: env.rpcUrl,
    consumerPrivateKey: env.researchPrivateKey,
    uuid: finalized.vaultUuid!,
    licenseTokenId: licenseTokenId,
  });
  console.log("");
  console.log(kleur.green().bold("    ✓ decrypted secret:"), kleur.white(secret));
  console.log("");
}

main().catch((err) => {
  console.error(kleur.red("✗ demo failed:"), err);
  process.exit(1);
});

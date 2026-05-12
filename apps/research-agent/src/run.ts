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
  ipId: Address;
  licenseTermsId: string;
  price: string;
  network: string;
  merchantAgent: Address;
  condition: string;
}

interface AccessReply {
  ok: boolean;
  error?: string;
  vaultUuid?: number;
  datasetId?: string;
  allocateTx?: string;
  writeTx?: string;
  licenseTokenId?: string;
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

  step(2, "Ask for access terms (skill: quote-access)");
  const quote = await sendJsonMessage<QuoteReply>(card.url, { type: "quote-access" });
  log("price:", kleur.yellow(quote.price));
  log("ipId:", quote.ipId);
  log("licenseTermsId:", quote.licenseTermsId);
  log("merchantAgent:", quote.merchantAgent);

  step(3, "Sign AP2 mandate authorizing the purchase");
  const mandate = newMandate({
    payerAgent: researcher.address,
    merchantAgent: quote.merchantAgent,
    purpose: `CDR access to dataset ${quote.datasetId}`,
    ipId: quote.ipId,
    licenseTermsId: quote.licenseTermsId,
    amount: env.maxBudgetIp,
    currency: "IP",
    network: "story-aeneid",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    allowedAction: "mint-license-and-grant-cdr-access",
  });
  const signed = await signMandate(mandate, env.researchPrivateKey);
  log("mandateId:", mandate.mandateId);
  log("signature:", signed.signature.slice(0, 18) + "…");

  step(4, "Mint license token via Story SDK (on-chain payment)");
  const mint = await mintLicense({
    rpcUrl: env.rpcUrl,
    buyerPrivateKey: env.researchPrivateKey,
    ipId: quote.ipId,
    licenseTermsId: quote.licenseTermsId,
    maxMintingFeeIp: env.maxBudgetIp,
  });
  const licenseTokenId = mint.licenseTokenIds[0];
  if (!licenseTokenId) throw new Error("no license token minted");
  log("txHash:", mint.txHash);
  log("licenseTokenId:", licenseTokenId.toString());

  step(5, "Present mandate + license to data-owner (skill: request-access)");
  const access = await sendJsonMessage<AccessReply>(card.url, {
    type: "request-access",
    datasetId: quote.datasetId,
    signedMandate: signed,
    licenseTokenId: licenseTokenId.toString(),
    requesterAddress: researcher.address,
  });
  if (!access.ok) throw new Error(`access denied: ${access.error}`);
  log("vaultUuid:", access.vaultUuid);
  log("allocateTx:", access.allocateTx);

  step(6, "Decrypt CDR vault using license token");
  const secret = await readLicenseGatedVault({
    rpcUrl: env.rpcUrl,
    consumerPrivateKey: env.researchPrivateKey,
    uuid: access.vaultUuid!,
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

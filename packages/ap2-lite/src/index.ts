import { hashMessage, recoverAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * AP2-style payment mandate. Off-chain agent-to-agent record stating that
 * `payerAgent` authorizes a bounded payment to `merchantAgent` for a specific
 * action. The on-chain license mint executes the intent.
 */
export interface Mandate {
  mandateId: string;
  payerAgent: Address;
  merchantAgent: Address;
  purpose: string;
  ipId: Address;
  licenseTermsId: string;
  amount: string;
  currency: "IP";
  network: "story-aeneid";
  expiresAt: string;
  allowedAction: "mint-license-and-grant-cdr-access";
}

export interface SignedMandate {
  mandate: Mandate;
  signature: Hex;
}

function canonicalize(m: Mandate): string {
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(m).sort()) {
    ordered[key] = (m as unknown as Record<string, unknown>)[key];
  }
  return JSON.stringify(ordered);
}

export async function signMandate(
  mandate: Mandate,
  payerPrivateKey: Hex,
): Promise<SignedMandate> {
  const account = privateKeyToAccount(payerPrivateKey);
  if (account.address.toLowerCase() !== mandate.payerAgent.toLowerCase()) {
    throw new Error(
      `Mandate payerAgent (${mandate.payerAgent}) does not match signing key (${account.address})`,
    );
  }
  const signature = await account.signMessage({ message: canonicalize(mandate) });
  return { mandate, signature };
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

export async function verifyMandate(signed: SignedMandate): Promise<VerifyResult> {
  try {
    const digest = hashMessage(canonicalize(signed.mandate));
    const recovered = await recoverAddress({ hash: digest, signature: signed.signature });
    if (recovered.toLowerCase() !== signed.mandate.payerAgent.toLowerCase()) {
      return { valid: false, reason: "signature does not match payerAgent" };
    }
    if (new Date(signed.mandate.expiresAt).getTime() < Date.now()) {
      return { valid: false, reason: "mandate expired" };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: (err as Error).message };
  }
}

export function newMandate(input: Omit<Mandate, "mandateId">): Mandate {
  return {
    mandateId: `mandate_${Math.random().toString(36).slice(2, 10)}`,
    ...input,
  };
}

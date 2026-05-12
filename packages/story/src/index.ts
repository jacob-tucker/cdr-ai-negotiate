import {
  StoryClient,
  type StoryConfig,
} from "@story-protocol/core-sdk";
import {
  createPublicClient,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const LICENSE_TOKEN_CONTRACT = "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC" as const; // PILicenseTemplate / LicenseToken NFT

const erc721OwnerOfAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export interface MintLicenseParams {
  rpcUrl: string;
  buyerPrivateKey: Hex;
  ipId: Address;
  licenseTermsId: string;
  maxMintingFeeIp: string;
}

export interface MintLicenseResult {
  licenseTokenIds: bigint[];
  txHash: Hex;
}

export async function mintLicense(params: MintLicenseParams): Promise<MintLicenseResult> {
  const account = privateKeyToAccount(params.buyerPrivateKey);
  const config: StoryConfig = {
    account,
    transport: http(params.rpcUrl),
    chainId: "aeneid",
  };
  const client = StoryClient.newClient(config);

  const response = await client.license.mintLicenseTokens({
    licensorIpId: params.ipId,
    licenseTermsId: BigInt(params.licenseTermsId),
    amount: 1,
    receiver: account.address,
    maxMintingFee: parseEther(params.maxMintingFeeIp),
    maxRevenueShare: 100,
  });

  return {
    licenseTokenIds: (response.licenseTokenIds ?? []) as bigint[],
    txHash: response.txHash as Hex,
  };
}

export interface VerifyLicenseOwnerParams {
  rpcUrl: string;
  licenseTokenId: bigint;
  expectedOwner: Address;
  licenseTokenContract?: Address;
}

/**
 * Owner-side check: confirm the license token NFT is held by the agent we
 * expect, before creating a vault for them.
 */
export async function verifyLicenseOwner(
  params: VerifyLicenseOwnerParams,
): Promise<boolean> {
  const client = createPublicClient({ transport: http(params.rpcUrl) });
  const owner = await client.readContract({
    address: params.licenseTokenContract ?? LICENSE_TOKEN_CONTRACT,
    abi: erc721OwnerOfAbi,
    functionName: "ownerOf",
    args: [params.licenseTokenId],
  });
  return owner.toLowerCase() === params.expectedOwner.toLowerCase();
}

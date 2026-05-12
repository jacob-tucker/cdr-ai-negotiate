import {
  PILFlavor,
  StoryClient,
  WIP_TOKEN_ADDRESS,
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

const LICENSE_TOKEN_CONTRACT =
  "0xFe3838BFb30B34170F00030B52eA4893d8aAC6bC" as const; // PILicenseTemplate / LicenseToken NFT

// Public SPG NFT collection on Aeneid testnet — convenient for demos.
const PUBLIC_SPG_COLLECTION =
  "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc" as const;

export interface RegisterIpWithTermsParams {
  rpcUrl: string;
  sellerPrivateKey: Hex;
  mintingFeeIp: string;
  spgNftContract?: Address;
}

export interface RegisterIpWithTermsResult {
  ipId: Address;
  licenseTermsId: string;
  txHash: Hex;
}

/**
 * Mint+register a fresh IP asset and attach commercial PIL terms in a single
 * transaction. Returns the new ipId and the licenseTermsId for the just-attached
 * commercial-use terms priced at `mintingFeeIp`.
 */
export async function registerIpAndAttachTerms(
  params: RegisterIpWithTermsParams,
): Promise<RegisterIpWithTermsResult> {
  const account = privateKeyToAccount(params.sellerPrivateKey);
  const client = StoryClient.newClient({
    account,
    transport: http(params.rpcUrl),
    chainId: "aeneid",
  } satisfies StoryConfig);

  const response = await client.ipAsset.registerIpAsset({
    nft: {
      type: "mint",
      spgNftContract: params.spgNftContract ?? PUBLIC_SPG_COLLECTION,
    },
    licenseTermsData: [
      {
        terms: PILFlavor.commercialUse({
          defaultMintingFee: parseEther(params.mintingFeeIp),
          currency: WIP_TOKEN_ADDRESS,
        }),
      },
    ],
  });

  const ipId = response.ipId;
  const termsId = response.licenseTermsIds?.[0];
  if (!ipId) throw new Error("registerIpAsset did not return an ipId");
  if (termsId === undefined)
    throw new Error("registerIpAsset did not return a licenseTermsId");

  return {
    ipId,
    licenseTermsId: termsId.toString(),
    txHash: (response.txHash ?? "0x") as Hex,
  };
}

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

export async function mintLicense(
  params: MintLicenseParams,
): Promise<MintLicenseResult> {
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

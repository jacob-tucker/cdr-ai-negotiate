import { encodeAbiParameters, type Address, type Hex } from "viem";
import { conditions, uuidToLabel } from "@piplabs/cdr-sdk";
import { makeCdrClient } from "./client.js";
import {
  LICENSE_READ_CONDITION,
  OWNER_ONLY_WRITE_CONDITION,
  PI_LICENSE_TEMPLATE,
} from "./addresses.js";

export interface CreateLicenseGatedVaultParams {
  rpcUrl: string;
  ownerPrivateKey: Hex;
  ownerAddress: Address;
  ipId: Address;
  secret: string;
}

export interface CreateLicenseGatedVaultResult {
  uuid: number;
  allocateTx: Hex;
  writeTx: Hex;
}

/**
 * Owner-side: creates a CDR vault encrypting `secret`. Reads gated by
 * ownership of a valid license token (via PILicenseTemplate) for `ipId`.
 */
export async function createLicenseGatedVault(
  params: CreateLicenseGatedVaultParams,
): Promise<CreateLicenseGatedVaultResult> {
  const { client } = await makeCdrClient({
    rpcUrl: params.rpcUrl,
    privateKey: params.ownerPrivateKey,
  });

  const globalPubKey = await client.observer.getGlobalPubKey();

  const writeCond = conditions.ownerOnly({
    address: OWNER_ONLY_WRITE_CONDITION,
    owner: params.ownerAddress,
  });

  const readCond = conditions.custom({
    address: LICENSE_READ_CONDITION,
    conditionData: encodeAbiParameters(
      [{ type: "address" }, { type: "address" }],
      [PI_LICENSE_TEMPLATE, params.ipId],
    ),
  });

  const result = await client.uploader.uploadCDR({
    dataKey: new TextEncoder().encode(params.secret),
    globalPubKey,
    updatable: false,
    writeConditionAddr: writeCond.address,
    writeConditionData: writeCond.conditionData,
    readConditionAddr: readCond.address,
    readConditionData: readCond.conditionData,
    accessAuxData: "0x",
  });

  return {
    uuid: result.uuid,
    allocateTx: result.txHashes.allocate,
    writeTx: result.txHashes.write,
  };
}

export interface ReadLicenseGatedVaultParams {
  rpcUrl: string;
  consumerPrivateKey: Hex;
  uuid: number;
  licenseTokenId: bigint;
  timeoutMs?: number;
}

/**
 * Consumer-side: reads the vault. `accessAuxData` carries the licenseTokenId
 * so the LicenseReadCondition contract can verify ownership.
 */
export async function readLicenseGatedVault(
  params: ReadLicenseGatedVaultParams,
): Promise<string> {
  const { client } = await makeCdrClient({
    rpcUrl: params.rpcUrl,
    privateKey: params.consumerPrivateKey,
  });

  const accessAuxData = encodeAbiParameters(
    [{ type: "uint256[]" }],
    [[params.licenseTokenId]],
  );

  const { dataKey } = await client.consumer.accessCDR({
    uuid: params.uuid,
    accessAuxData,
    timeoutMs: params.timeoutMs ?? 120_000,
  });

  return new TextDecoder().decode(dataKey);
}

export { uuidToLabel };

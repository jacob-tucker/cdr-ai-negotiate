# CDR × A2A — Agent-Native Encrypted Data Markets

Two autonomous agents that discover each other over **A2A**, negotiate a price live, settle on-chain by registering a fresh **Story IP asset + license terms**, mint a license token, and unlock encrypted data through a **CDR vault**. Everything — including the IP asset and license terms — is created at runtime during the negotiation.

## What you need to provide

Edit `.env` (copy from `.env.example`):

- `DATA_OWNER_PRIVATE_KEY` — testnet wallet that will own the IP asset (needs IP for the registration tx + vault writes)
- `RESEARCH_AGENT_PRIVATE_KEY` — testnet wallet that will buy the license (needs ≥ 1 IP)
- `STORY_RPC_URL` — defaults to `https://aeneid.storyrpc.io`

Optional pricing knobs (all caps capped at 1 IP):

- `SELLER_MIN_PRICE_IP` / `SELLER_MAX_PRICE_IP` — seller's quote range
- `RESEARCH_MAX_BUDGET_IP` / `RESEARCH_COUNTER_FACTOR` — buyer's counter strategy

## One-time setup

The CDR SDK isn't on npm yet — clone it as a sibling of this repo and build it. The workspace's `pnpm.overrides` points `@piplabs/cdr-sdk` (and its two internal deps) at those built directories.

```bash
# 1. Clone the CDR SDK as a sibling of this repo, then build it.
git clone https://github.com/piplabs/cdr-sdk.git --branch 0.1.1 --depth 1 ../cdr-sdk
( cd ../cdr-sdk && pnpm install && pnpm build )

# 2. Install workspace deps.
pnpm install

# 3. Copy + fill .env.
cp .env.example .env
```

## Run the demo

In one terminal:

```bash
pnpm data-owner
```

In another:

```bash
pnpm demo
```

You'll see the 7-step flow:

1. **Discover** — Research Agent fetches the Data Owner's `/.well-known/agent-card.json`
2. **Propose Terms** — Data Owner returns a randomized opening price (≤ 1 IP)
3. **Counter-Offer** — Research Agent counters lower; Data Owner accepts
4. **Sign Mandate** — Research Agent signs an AP2 mandate at the agreed price
5. **Finalize Deal** — Data Owner registers a fresh IP asset with commercial license terms priced at the agreed amount, creates a CDR vault gated by license-token ownership, and returns the new `ipId` / `licenseTermsId` / `vaultUuid`
6. **Mint License** — Research Agent calls `mintLicenseTokens` on Story; the agreed price is paid on-chain
7. **Decrypt** — Research Agent calls `CDR.read`; validators verify ownership and return partial decryptions; the secret is recombined client-side

## Web one-pager

```bash
pnpm web
```

Opens at `http://localhost:3000`.

## Layout

```
apps/
  data-owner-agent/    A2A server (Express + @a2a-js/sdk)
  research-agent/      A2A client + demo runner
  web/                 Next.js one-pager

packages/
  ap2-lite/            Sign + verify AP2-style mandates
  cdr/                 Wraps @piplabs/cdr-sdk: createLicenseGatedVault, readLicenseGatedVault
  story/               Wraps @story-protocol/core-sdk: registerIpAndAttachTerms, mintLicense, verifyLicenseOwner
```

## Protocols

- **A2A 0.3** — agent discovery via `/.well-known/agent-card.json`, JSON-RPC `message/send`
- **AP2-style mandate** — signed JSON: payer authorizes ≤ N IP to merchant for a specific action
- **Story** — `registerIpAsset` (mint NFT + register IP + attach PIL terms) and `mintLicenseTokens`
- **CDR** — TDH2 threshold-encrypted vault with `LicenseReadCondition` gating reads to license-token holders

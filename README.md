# CDR × A2A — Agent-Native Encrypted Data Markets

Two autonomous agents that discover each other over **A2A**, negotiate access via an **AP2-style mandate**, settle on-chain by minting a **Story Protocol license**, and unlock encrypted data through a **CDR vault**.

## What you need to provide

Edit `.env` (copy from `.env.example`):

- `DATA_OWNER_PRIVATE_KEY` — testnet wallet that owns the IP asset
- `RESEARCH_AGENT_PRIVATE_KEY` — testnet wallet that will buy the license (must hold ≥ 1 IP)
- `IP_ID` — pre-registered IP asset
- `LICENSE_TERMS_ID` — license terms attached to that IP asset, priced at 1 IP
- `STORY_RPC_URL` — defaults to `https://aeneid.storyrpc.io`

## One-time setup

```bash
# 1. Clone + build the CDR SDK into ../cdr-sdk and pack tarballs
./scripts/bootstrap-cdr-sdk.sh

# 2. Install workspace deps
pnpm install

# 3. Copy + fill .env
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

You'll see the 6-step flow:

1. Research agent discovers data-owner's `/.well-known/agent-card.json`
2. Research agent calls `quote-access` skill
3. Research agent signs an AP2 mandate
4. Research agent mints a license token on-chain (1 IP paid to data-owner via Story Protocol)
5. Research agent calls `request-access` with mandate + token — data-owner verifies, creates a CDR vault gated by the license token
6. Research agent decrypts the vault using its license token

## Web one-pager

```bash
pnpm web
```

Opens at `http://localhost:3000` — blank scaffold, ready for design.

## Layout

```
apps/
  data-owner-agent/    A2A server (Express + @a2a-js/sdk)
  research-agent/      A2A client + demo runner
  web/                 Next.js one-pager

packages/
  ap2-lite/            Sign + verify AP2-style mandates
  cdr/                 Wraps @piplabs/cdr-sdk, exposes createLicenseGatedVault + readLicenseGatedVault
  story/               Wraps @story-protocol/core-sdk, exposes mintLicense + verifyLicenseOwner
```

## Protocols

- **A2A 0.3** — agent discovery via `/.well-known/agent-card.json`, JSON-RPC `message/send`
- **AP2-style mandate** — signed JSON: payer authorizes ≤ N IP to merchant for a specific action, scoped to one IP asset + license terms
- **Story Protocol** — `mintLicenseTokens` is the on-chain settlement
- **CDR** — TDH2 threshold-encrypted vault with `LicenseReadCondition` gating reads to license-token holders

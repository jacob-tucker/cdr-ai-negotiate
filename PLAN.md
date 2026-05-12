Hey there Claude. I am making a demo right now of agents interacting and "negotiating" with each other using CDR. Here is a plan I got from OpenAI:

Yes. The “real” version should use:

**A2A for agent discovery + communication** and **AP2 for payment authorization/mandates**. Then CDR is the actual app-specific capability the agents use after payment/authorization.

A2A is an open Agent2Agent protocol originally from Google and now under the Linux Foundation, with official docs and SDKs. Agents expose an **Agent Card** at `/.well-known/agent.json` for discovery. ([A2A Protocol][1]) AP2 is Google’s Agent Payments Protocol for secure agent-led transactions, and it is designed as an extension around A2A/agent commerce flows. ([AP2 Protocol][2])

## Demo concept

Build:

```txt
Research Agent
wants access to encrypted data

↕ A2A

Data Owner Agent
controls CDR access policy

↕ AP2-style payment mandate / proof

CDR smart contracts
grant encrypted access after terms are satisfied
```

The demo story:

> A research agent discovers a data-owner agent, negotiates access to encrypted data, gets a payment/access mandate, pays or proves authorization, and the data-owner agent calls CDR to grant access.

## What to build

### 1. Two A2A servers

Each agent is a real HTTP server.

```txt
/apps/data-owner-agent
/apps/research-agent
```

Each exposes:

```txt
GET /.well-known/agent.json
POST /a2a
```

The Agent Card for the data owner advertises CDR capabilities:

```json
{
  "name": "CDR Data Owner Agent",
  "description": "Sells programmable access to encrypted datasets through CDR.",
  "url": "https://data-owner.local/a2a",
  "capabilities": {
    "streaming": false
  },
  "skills": [
    {
      "id": "request-cdr-access",
      "name": "Request CDR Dataset Access",
      "description": "Negotiate and grant access to encrypted datasets using CDR."
    },
    {
      "id": "quote-cdr-access",
      "name": "Quote CDR Access Terms",
      "description": "Returns price, expiration, and access conditions."
    }
  ],
  "metadata": {
    "walletAddress": "0xDataOwnerAgentWallet",
    "cdrContract": "0xCdrContract",
    "network": "story-aeneid"
  }
}
```

### 2. Agent wallets

Use testnet wallets for the demo.

```env
DATA_OWNER_PRIVATE_KEY=0x...
RESEARCH_AGENT_PRIVATE_KEY=0x...
STORY_RPC_URL=...
CDR_CONTRACT_ADDRESS=0x...
```

Do **not** put private keys in prompts. The model can decide “call grant access,” but only your tool code signs.

```txt
LLM says: call grant_cdr_access
Tool code validates args
Wallet signs tx
Contract updates CDR state
Tool returns tx hash
```

### 3. CDR tools

Each agent gets tools like:

```ts
quoteAccess(datasetId);
createAccessMandate(datasetId, price, expiration);
payForAccess(mandateId);
verifyPaymentOrMandate(mandateId);
grantCdrAccess(datasetId, requesterWallet, expiration);
getEncryptedPayload(datasetId);
```

For the hackathon demo, the most important one is:

```ts
grantCdrAccess({
  datasetId,
  requester,
  expiration,
});
```

### 4. AP2 layer

Use AP2 for the “agent is allowed to pay / transact” part.

The AP2-shaped object in your demo should represent a **mandate**:

```json
{
  "mandateId": "mandate_123",
  "payerAgent": "0xResearchAgentWallet",
  "merchantAgent": "0xDataOwnerAgentWallet",
  "purpose": "CDR dataset access",
  "datasetId": "encrypted-healthcare-demo-v1",
  "amount": "10",
  "currency": "IP",
  "network": "story-aeneid",
  "expiresAt": "2026-06-05T00:00:00Z",
  "allowedAction": "grant_cdr_access"
}
```

In the first version, you can implement this as a signed JSON mandate using the research agent wallet, then later replace or extend it with the official AP2 sample libraries.

## Recommended build plan

### Phase 1: Real A2A discovery

Implement the two agents as A2A-compatible servers.

Deliverable:

```txt
Research Agent fetches:
GET http://localhost:3001/.well-known/agent.json

Then sends an A2A task:
"Request access to dataset X"
```

Use the official A2A JS SDK if you want this to feel legit. There is an official `@a2a-js/sdk` package for building A2A servers. ([GitHub][3])

### Phase 2: Negotiation

Research Agent asks:

```txt
I want access to dataset health-demo-v1 for model training.
What are your terms?
```

Data Owner Agent replies:

```json
{
  "datasetId": "health-demo-v1",
  "price": "10 IP",
  "accessDuration": "7 days",
  "condition": "payment + wallet authorization"
}
```

### Phase 3: AP2-style mandate

Research Agent signs a mandate:

```txt
I authorize my agent wallet to pay up to 10 IP for access to health-demo-v1.
```

This becomes the proof the data-owner agent needs before granting access.

### Phase 4: Wallet transaction

Research Agent sends payment or payment proof.

For demo simplicity:

```ts
await researchWalletClient.sendTransaction({
  to: dataOwnerAddress,
  value: parseEther("10"),
});
```

Or if CDR has a specific payment/access method, call that instead.

### Phase 5: CDR grant

Data Owner Agent verifies:

```txt
payment received
mandate valid
requester wallet matches mandate
dataset terms accepted
```

Then calls:

```ts
await dataOwnerWalletClient.writeContract({
  address: CDR_CONTRACT_ADDRESS,
  abi: cdrAbi,
  functionName: "grantAccess",
  args: [datasetId, requesterWallet, expiration],
});
```

### Phase 6: Final agent-to-agent response

Data Owner Agent sends back:

```json
{
  "status": "access_granted",
  "datasetId": "health-demo-v1",
  "txHash": "0x...",
  "expiresAt": "2026-06-05T00:00:00Z",
  "encryptedDataUrl": "ipfs://...",
  "decryptionCondition": "CDR access granted to 0xResearchAgentWallet"
}
```

## Folder structure

```txt
cdr-a2a-demo/
  apps/
    data-owner-agent/
      src/
        server.ts
        agent-card.ts
        tools/
          quote-access.ts
          verify-mandate.ts
          grant-cdr-access.ts
          wallet.ts

    research-agent/
      src/
        server.ts
        discover-agent.ts
        tools/
          create-mandate.ts
          pay-for-access.ts
          wallet.ts

  packages/
    cdr/
      abi.ts
      client.ts

    ap2-lite/
      mandate.ts
      signMandate.ts
      verifyMandate.ts

  .env
```

## The “wow” demo flow

In the terminal:

```txt
1. Research Agent discovers Data Owner Agent via /.well-known/agent.json

2. Research Agent:
   “I need access to your encrypted healthcare dataset.”

3. Data Owner Agent:
   “Access costs 10 IP for 7 days. Send a signed payment mandate.”

4. Research Agent signs AP2-style mandate.

5. Research Agent pays with its wallet.

6. Data Owner Agent verifies payment.

7. Data Owner Agent calls CDR grantAccess().

8. Research Agent receives encrypted dataset URL + access proof.
```

## What I would call it

**“A2A + CDR: Agent-Native Encrypted Data Markets”**

Or more plainly:

> Autonomous agents can discover, negotiate, pay for, and unlock encrypted data using A2A, AP2-style mandates, and CDR.

That is a very strong demo because it shows CDR is not just “encrypted data,” it is infrastructure for **agent-to-agent data commerce**.

[1]: https://a2a-protocol.org/latest/?utm_source=chatgpt.com "Agent2Agent (A2A) Protocol"
[2]: https://ap2-protocol.org/?utm_source=chatgpt.com "AP2 - Agent Payments Protocol Documentation"
[3]: https://github.com/a2aproject/a2a-js?utm_source=chatgpt.com "a2aproject/a2a-js: Official JavaScript SDK for the ..."

---

ok thats the end of the plan. Now here are the docs about using CDR. For this example, the way the agents will negotiate is one agent will have a IP_ID (IP Asset) and a liense attached to that ip asset that costs 1 IP. The other agent, when it decides to buy the data (the "IP Asset") will buy the license using `mintLicenseTokens` in the Story SDK. Then it will be able to read the data!

The IP_ID and LICENSE_TOKEN_ID will already be made. During the negotiation the agent providing the data should create a new CDR vault and the read condition be the license token read one. Okay, here are the CDR docs:

- https://docs.story.foundation/developers/cdr-sdk/overview
- https://docs.story.foundation/developers/cdr-sdk/encrypt-and-decrypt
- https://docs.story.foundation/developers/cdr-sdk/setup
- https://docs.story.foundation/developers/cdr-sdk/ip-asset-vaults
- https://docs.story.foundation/sdk-reference/cdr/overview

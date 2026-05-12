"use client";

import { useEffect, useState, type ReactNode } from "react";

type Proto = "a2a" | "ap2" | "cdr" | "story";
type Flow = "r2o" | "o2r" | "self-research" | "self-data-owner";

interface Step {
  n: string;
  title: string;
  flow: Flow;
  // The protocol that *carries* the message / drives this step.
  // Used to tint the arrow and the primary detail chip.
  proto: Proto;
  // What the message/operation actually is, in short.
  method: string;
  // Any additional protocols this step touches (extra chips in detail header).
  alsoTouches?: Proto[];
  chain: boolean;
  chainNote?: string;
  what: ReactNode;
  outcome: ReactNode;
  outcomeKind?: "default" | "success";
  code: ReactNode;
}

// Inline keyword highlight — wrap protocol mentions in the prose so they
// pick up the same color as the chip / arrow for that protocol.
const Kw = ({ p, children }: { p: Proto; children: ReactNode }) => (
  <span className={`kw ${p}`}>{children}</span>
);

const PROTO_LABEL: Record<Proto, string> = {
  a2a: "A2A",
  ap2: "AP2",
  cdr: "CDR",
  story: "Story",
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "Discover",
    flow: "o2r",
    proto: "a2a",
    method: "GET /.well-known/agent-card.json",
    chain: false,
    what: (
      <>
        Research Agent fetches the Data Owner's public{" "}
        <Kw p="a2a">agent card</Kw> over <Kw p="a2a">A2A</Kw> to learn what
        skills it offers and where to reach it.
      </>
    ),
    outcome: (
      <>
        Research Agent now knows the Data Owner's <b>skills</b> and{" "}
        <b>JSON-RPC endpoint</b>.
      </>
    ),
    code: (
      <>
        <span className="s">GET</span>{" "}
        <span className="k">/.well-known/agent-card.json</span>
        {"\n"}
        <span className="s">→</span> {"{"}
        {"\n  "}
        <span className="k">"name"</span>:{" "}
        <span className="v">"CDR Data Owner Agent"</span>,
        {"\n  "}
        <span className="k">"skills"</span>: [
        <span className="v">"propose-terms"</span>,{" "}
        <span className="v">"counter-offer"</span>,{" "}
        <span className="v">"finalize-deal"</span>]
        {"\n"}
        {"}"}
      </>
    ),
  },
  {
    n: "02",
    title: "Propose Terms",
    flow: "o2r",
    proto: "a2a",
    method: "skill · propose-terms",
    chain: false,
    what: (
      <>
        Research Agent opens negotiation. Data Owner replies with the dataset
        description and an <b>opening price</b> — no IP asset exists yet, just
        a quote.
      </>
    ),
    outcome: (
      <>
        Seller asks <b>0.87 IP</b> for confidential dataset access.
      </>
    ),
    code: (
      <>
        {"{"}
        {"\n  "}
        <span className="k">"datasetId"</span>:{" "}
        <span className="v">"health-demo-v1"</span>,
        {"\n  "}
        <span className="k">"openingPrice"</span>:{" "}
        <span className="v">"0.87"</span>,
        {"\n  "}
        <span className="k">"currency"</span>:{" "}
        <span className="v">"IP"</span>
        {"\n"}
        {"}"}
      </>
    ),
  },
  {
    n: "03",
    title: "Counter-Offer",
    flow: "r2o",
    proto: "a2a",
    method: "skill · counter-offer",
    chain: false,
    what: (
      <>
        Research Agent counters with a lower price. Data Owner checks it's
        within its floor and accepts. The agreed price is{" "}
        <b>guaranteed ≤ 1 IP</b>.
      </>
    ),
    outcome: (
      <>
        Deal at <b>0.61 IP</b>. No on-chain action yet — just two agents
        agreeing.
      </>
    ),
    code: (
      <>
        <span className="s">→</span> {"{"}{" "}
        <span className="k">"proposedPrice"</span>:{" "}
        <span className="v">"0.61"</span> {"}"}
        {"\n"}
        <span className="s">←</span> {"{"}{" "}
        <span className="k">"type"</span>:{" "}
        <span className="v">"accept-counter"</span>,{" "}
        <span className="k">"agreedPrice"</span>:{" "}
        <span className="v">"0.61"</span> {"}"}
      </>
    ),
  },
  {
    n: "04",
    title: "Sign Mandate",
    flow: "self-research",
    proto: "ap2",
    method: "off-chain · wallet signature",
    chain: false,
    what: (
      <>
        Research Agent signs an <Kw p="ap2">AP2</Kw> mandate authorizing
        exactly the agreed amount for this purchase. Off-chain, wallet-signed
        proof of intent.
      </>
    ),
    outcome: (
      <>
        Signed mandate authorizing <b>0.61 IP</b>. <b>Still nothing on-chain.</b>
      </>
    ),
    code: (
      <>
        {"{"}
        {"\n  "}
        <span className="k">"payerAgent"</span>:{" "}
        <span className="n">"0xRsr…cc3a"</span>,
        {"\n  "}
        <span className="k">"merchantAgent"</span>:{" "}
        <span className="n">"0xOwn…f7b1"</span>,
        {"\n  "}
        <span className="k">"amount"</span>:{" "}
        <span className="v">"0.61"</span>,{" "}
        <span className="k">"currency"</span>:{" "}
        <span className="v">"IP"</span>,
        {"\n  "}
        <span className="k">"allowedAction"</span>:{" "}
        <span className="v">"mint-license-and-grant-cdr-access"</span>,
        {"\n  "}
        <span className="k">"signature"</span>:{" "}
        <span className="n">"0x044925ad…b561"</span>
        {"\n"}
        {"}"}
      </>
    ),
  },
  {
    n: "05",
    title: "Finalize Deal",
    flow: "r2o",
    proto: "a2a",
    method: "skill · finalize-deal",
    alsoTouches: ["ap2", "story", "cdr"],
    chain: true,
    chainNote:
      "registerIpAsset (mints NFT + attaches PIL terms) + CDR allocate + write",
    what: (
      <>
        Research Agent presents the <Kw p="ap2">AP2</Kw> mandate. Data Owner
        verifies it, then in two on-chain actions:{" "}
        <Kw p="story">registers a new IP asset</Kw> with commercial license
        terms priced at the agreed amount, and creates a{" "}
        <Kw p="cdr">CDR vault</Kw> gated by license-token ownership for that IP.
      </>
    ),
    outcome: (
      <>
        Brand-new <b>ipId</b>, <b>licenseTermsId</b>, and{" "}
        <b>vault uuid 1077</b> — all minted just-in-time for this deal.
      </>
    ),
    code: (
      <>
        <span className="s">→</span> {"{"}{" "}
        <span className="k">"agreedPrice"</span>:{" "}
        <span className="v">"0.61"</span>,{" "}
        <span className="k">"signedMandate"</span>: … {"}"}
        {"\n"}
        <span className="s">←</span> {"{"}
        {"\n  "}
        <span className="k">"ipId"</span>:{" "}
        <span className="n">"0x71F2…9b3c"</span>,
        {"\n  "}
        <span className="k">"licenseTermsId"</span>:{" "}
        <span className="v">"248"</span>,
        {"\n  "}
        <span className="k">"vaultUuid"</span>:{" "}
        <span className="v">1077</span>,
        {"\n  "}
        <span className="k">"ipTxHash"</span>:{" "}
        <span className="n">"0xae3b…77d2"</span>
        {"\n"}
        {"}"}
      </>
    ),
  },
  {
    n: "06",
    title: "Mint License",
    flow: "self-research",
    proto: "story",
    method: "tx · mintLicenseTokens",
    chain: true,
    chainNote: "mintLicenseTokens · 0.61 IP transferred → license NFT minted",
    what: (
      <>
        Research Agent calls <Kw p="story">mintLicenseTokens</Kw> for the IP
        the seller just registered. <b>0.61 IP</b> is paid on-chain to the
        seller's royalty vault; a license NFT is minted to the buyer.
      </>
    ),
    outcome: (
      <>
        Research Agent now holds <b>license token #72517</b> for the new IP.
      </>
    ),
    code: (
      <>
        <span className="s">writeContract</span>({"{"}
        {"\n  "}
        <span className="k">licensorIpId</span>:{" "}
        <span className="n">"0x71F2…9b3c"</span>,
        {"\n  "}
        <span className="k">licenseTermsId</span>:{" "}
        <span className="v">248n</span>,
        {"\n  "}
        <span className="k">maxMintingFee</span>:{" "}
        <span className="v">parseEther("0.61")</span>
        {"\n"}
        {"}"}) <span className="s">→</span>{" "}
        <span className="k">licenseTokenId</span>:{" "}
        <span className="v">72517</span>
      </>
    ),
  },
  {
    n: "07",
    title: "Decrypt",
    flow: "self-research",
    proto: "cdr",
    method: "CDR.read · threshold decryption",
    alsoTouches: ["story"],
    chain: true,
    chainNote: "CDR read · Story validators return partial decryptions",
    what: (
      <>
        Research Agent calls <Kw p="cdr">CDR.read</Kw> with its license token.{" "}
        <Kw p="story">Story</Kw> validators verify ownership on-chain and
        return TDH2 partial decryptions; the secret is recombined client-side.
      </>
    ),
    outcomeKind: "success",
    outcome: (
      <>
        Secret recovered: <span className="mono">"this is the secret!"</span>
      </>
    ),
    code: (
      <>
        <span className="s">accessCDR</span>({"{"}
        {"\n  "}
        <span className="k">uuid</span>: <span className="v">1077</span>,
        {"\n  "}
        <span className="k">accessAuxData</span>:{" "}
        <span className="n">"0x…11b45"</span>
        {"\n"}
        {"}"}) <span className="s">→</span>{" "}
        <span style={{ color: "var(--green)" }}>"this is the secret!"</span>
      </>
    ),
  },
];

export function Demo() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 5600);
    return () => clearInterval(id);
  }, [paused]);

  const s = STEPS[step]!;
  const researchActive =
    s.flow === "r2o" || s.flow === "o2r" || s.flow === "self-research";
  const ownerActive =
    s.flow === "r2o" || s.flow === "o2r" || s.flow === "self-data-owner";

  const chips: Proto[] = [s.proto, ...(s.alsoTouches ?? [])];

  return (
    <>
      <Legend />

      <section
        className="stage"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="agents-row">
          <AgentCard
            role="buyer"
            name="Research Agent"
            wallet="0xRsr…cc3a"
            blurb={
              <>
                Spends <b>IP</b>, holds the <b>license NFT</b>, decrypts
                purchased data.
              </>
            }
            active={researchActive}
          />

          <Connector
            flow={s.flow}
            proto={s.proto}
            method={s.method}
            stepKey={s.n}
          />

          <AgentCard
            role="seller"
            name="CDR Data Owner"
            wallet="0xOwn…f7b1"
            blurb={
              <>
                Owns the <b>IP asset</b>, sells license-gated access to a{" "}
                <b>CDR vault</b>.
              </>
            }
            active={ownerActive}
          />
        </div>

        <div className="detail" key={`d-${s.n}`}>
          <div className="detail-head">
            <span className="step-num">STEP {s.n}</span>
            <h4>{s.title}</h4>
            <span className="chips">
              {chips.map((p) => (
                <span key={p} className={`proto-chip ${p}`}>
                  {PROTO_LABEL[p]}
                </span>
              ))}
            </span>
          </div>
          <p className="what">{s.what}</p>
          <pre className="code mono">{s.code}</pre>
          <div
            className={`outcome ${s.outcomeKind === "success" ? "success" : ""}`}
          >
            <span className="icon">
              {s.outcomeKind === "success" ? "✓" : "→"}
            </span>
            <span>{s.outcome}</span>
          </div>
        </div>

        <div className={`chain-bar ${s.chain ? "active" : ""}`}>
          <div className="label">
            <span className="ind" />
            Story L1 · Aeneid testnet
          </div>
          <div className="meta">
            {s.chain ? s.chainNote : "idle · no on-chain action this step"}
          </div>
        </div>
      </section>

      <div className="rail" role="tablist">
        {STEPS.map((stepDef, i) => (
          <button
            type="button"
            key={stepDef.n}
            className={i === step ? "active" : ""}
            onClick={() => {
              setStep(i);
              setPaused(true);
            }}
          >
            <span className="n">STEP {stepDef.n}</span>
            <span className="t">{stepDef.title}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function Legend() {
  const items: { p: Proto; label: string; hint: string }[] = [
    { p: "a2a", label: "A2A", hint: "agent ↔ agent comms" },
    { p: "ap2", label: "AP2", hint: "Google's signed mandate" },
    { p: "cdr", label: "CDR", hint: "encrypted-data vault" },
    { p: "story", label: "Story", hint: "on-chain license + tx" },
  ];
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.p} className="legend-item">
          <span
            className="swatch"
            style={{ background: `var(--${it.p})` }}
          />
          <b>{it.label}</b>
          <span>· {it.hint}</span>
        </span>
      ))}
    </div>
  );
}

function Connector({
  flow,
  proto,
  method,
  stepKey,
}: {
  flow: Flow;
  proto: Proto;
  method: string;
  stepKey: string;
}) {
  const chip = (
    <span className={`proto-chip ${proto}`}>{PROTO_LABEL[proto]}</span>
  );

  if (flow.startsWith("self")) {
    return (
      <div className="connector">
        <div className="chip-row">{chip}</div>
        <div className="self-loop">internal · no message sent</div>
        <div className="method">{method}</div>
      </div>
    );
  }

  const dir = flow === "r2o" ? "right" : "left";
  return (
    <div className="connector">
      <div className="chip-row">{chip}</div>
      <div
        className={`arrow-track ${proto} ${dir}`}
        key={`track-${stepKey}`}
      >
        <span className="pulse" />
        <span className={`arrow-head ${dir}`} />
      </div>
      <div className="method">{method}</div>
    </div>
  );
}

function AgentCard({
  role,
  name,
  wallet,
  blurb,
  active,
}: {
  role: string;
  name: string;
  wallet: string;
  blurb: ReactNode;
  active: boolean;
}) {
  return (
    <div className={`agent ${active ? "active" : ""}`}>
      <div className="role">
        <span className="ind" />
        {role}
      </div>
      <h3>{name}</h3>
      <div className="wallet">{wallet}</div>
      <div className="blurb">{blurb}</div>
    </div>
  );
}

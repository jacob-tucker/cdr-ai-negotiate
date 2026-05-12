import { Demo } from "./_components/Demo";

export default function Home() {
  return (
    <main className="shell">
      <nav className="topbar">
        <div className="left">
          <span className="dot" />
          <span><b>CDR × A2A</b></span>
          <span className="tag">demo · agent-native data markets</span>
        </div>
        <div className="right">
          <span className="tag">network <b>story-aeneid</b></span>
          <span className="tag">protocol <b>A2A 0.3</b></span>
        </div>
      </nav>

      <section className="hero">
        <p className="eyebrow">CDR · A2A · AP2 · Story</p>
        <h1>
          Agent-native <em>encrypted data</em> markets.
        </h1>
        <p>
          Two autonomous agents — a buyer and a seller — discover each other,
          negotiate, pay on-chain by minting a Story license, and unlock
          encrypted data through a CDR vault. Six steps, open protocols
          end-to-end.
        </p>
      </section>

      <Demo />

      <footer className="footer">
        <span>© CDR Demo</span>
        <span>built on @piplabs/cdr-sdk · @a2a-js/sdk · @story-protocol/core-sdk</span>
      </footer>
    </main>
  );
}
